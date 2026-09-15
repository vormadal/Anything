using System.Net;
using System.Security.Cryptography;
using Anything.Application.Configuration;
using Anything.Application.Notifications;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Lib.Net.Http.WebPush;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Notifications;

public class PushDispatchQueueTests
{
    private static PushDispatch Dispatch(string title) =>
        new() { UserIds = [1], Title = title };

    /// <summary>
    /// Stop reading with <c>break</c>, never by cancelling the token mid-loop.
    /// <c>ReadAllAsync</c>'s inner drain loop yields every buffered item without
    /// re-checking the token, so cancelling inside the body doesn't end the
    /// enumeration — it keeps yielding and then throws once the buffer empties.
    /// The token here is only a hang guard: if the queue ever stops producing,
    /// the test fails on the timeout instead of blocking the suite.
    /// </summary>
    private static async Task<List<string>> ReadTitles(PushDispatchQueue queue, int count)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var read = new List<string>();

        await foreach (var item in queue.ReadAllAsync(timeout.Token))
        {
            read.Add(item.Title);
            if (read.Count == count) break;
        }

        return read;
    }

    [Fact]
    public async Task Enqueued_ItemsComeBackInOrder()
    {
        var queue = new PushDispatchQueue();

        Assert.True(queue.TryEnqueue(Dispatch("first")));
        Assert.True(queue.TryEnqueue(Dispatch("second")));

        Assert.Equal(["first", "second"], await ReadTitles(queue, 2));
    }

    [Fact]
    public void TryEnqueue_PastCapacity_KeepsAcceptingRatherThanReportingFull()
    {
        var queue = new PushDispatchQueue();

        // Well past the bounded capacity. Every call still succeeds: the
        // channel drops its oldest item to make room rather than refusing, so
        // a stalled push service can never block or fail a producer.
        for (var i = 0; i < 5000; i++)
            Assert.True(queue.TryEnqueue(Dispatch($"item-{i}")));
    }

    [Fact]
    public async Task WhenOverflowed_TheOldestItemsAreTheOnesDropped()
    {
        var queue = new PushDispatchQueue();
        const int written = 5000;

        for (var i = 0; i < written; i++)
            queue.TryEnqueue(Dispatch($"item-{i}"));

        var first = (await ReadTitles(queue, 1)).Single();

        // Not "item-0" — the early ones were dropped to make room. Which nudge
        // is stale and which is current is the whole point of dropping oldest
        // rather than refusing the write.
        var survivingIndex = int.Parse(first["item-".Length..]);
        Assert.True(
            survivingIndex > 0,
            $"Expected the oldest items to have been dropped, but the queue still starts at {first}.");
        Assert.True(survivingIndex < written, $"Unexpected item {first}.");
    }
}

public class VapidCredentialsTests
{
    private static VapidCredentials Create(string? publicKey, string? privateKey, string? subject) =>
        new(Options.Create(new PushSettings
        {
            PublicKey = publicKey,
            PrivateKey = privateKey,
            Subject = subject
        }));

    [Fact]
    public void WithNoSettings_ReportsUnconfigured()
    {
        using var credentials = Create(null, null, null);

        Assert.False(credentials.IsConfigured);
        Assert.Null(credentials.Authentication);
        Assert.Null(credentials.PublicKey);
    }

    [Theory]
    // Every partial combination must read as "off" rather than half-working —
    // a deployment that set only some of the values gets push disabled, not a
    // crash on the first notification.
    [InlineData("pub", "priv", null)]
    [InlineData("pub", null, "mailto:a@b.c")]
    [InlineData(null, "priv", "mailto:a@b.c")]
    [InlineData("", "priv", "mailto:a@b.c")]
    [InlineData("   ", "priv", "mailto:a@b.c")]
    public void WithIncompleteSettings_ReportsUnconfigured(string? publicKey, string? privateKey, string? subject)
    {
        using var credentials = Create(publicKey, privateKey, subject);

        Assert.False(credentials.IsConfigured);
    }
}

/// <summary>
/// Answers every request with one status, and counts what it was asked for.
/// This is what makes the real send path testable without a push service:
/// PushServiceClient takes an HttpClient, so the library still builds the VAPID
/// token and encrypts the payload for real — only the transport is fake.
/// </summary>
file sealed class StubPushService(HttpStatusCode status) : HttpMessageHandler
{
    public int Requests { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Requests++;
        return Task.FromResult(new HttpResponseMessage(status));
    }
}

public class WebPushSenderTests
{
    private static readonly DateTime Now = new(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc);

    private readonly IRepository<PushDevice> _deviceRepo = Substitute.For<IRepository<PushDevice>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _time = Substitute.For<TimeProvider>();

    public WebPushSenderTests()
    {
        _time.GetUtcNow().Returns(new DateTimeOffset(Now, TimeSpan.Zero));
        _deviceRepo.Query().Returns(new List<PushDevice>().AsAsyncQueryable());
    }

    /// <summary>
    /// A device whose keys are a real P-256 public point and a 16-byte auth
    /// secret — what a browser actually hands over. Placeholders would fail
    /// inside the library's payload encryption rather than in the sender.
    /// </summary>
    private static PushDevice RealDevice(int id, int userId = 1)
    {
        using var ecdh = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        var parameters = ecdh.ExportParameters(includePrivateParameters: false);

        var publicKey = new byte[65];
        publicKey[0] = 0x04;
        parameters.Q.X!.CopyTo(publicKey, 1);
        parameters.Q.Y!.CopyTo(publicKey, 33);

        return new PushDevice
        {
            Id = id,
            UserId = userId,
            Endpoint = $"https://push.example.com/device-{id}",
            P256dhKey = TestVapid.Base64Url(publicKey),
            AuthKey = TestVapid.Base64Url(RandomNumberGenerator.GetBytes(16))
        };
    }

    private WebPushSender CreateSender(VapidCredentials credentials, HttpMessageHandler handler) =>
        new(new PushServiceClient(new HttpClient(handler)), credentials, _deviceRepo, _unitOfWork,
            _time, NullLogger<WebPushSender>.Instance);

    [Fact]
    public async Task Send_DeliversToEveryLiveDeviceOfTheRecipients()
    {
        using var credentials = TestVapid.Configured();
        _deviceRepo.Query().Returns(new List<PushDevice>
        {
            RealDevice(1),
            RealDevice(2),
            // Already pruned or unsubscribed — must not be contacted again.
            new PushDevice
            {
                Id = 3, UserId = 1, Endpoint = "https://push.example.com/dead",
                P256dhKey = "k", AuthKey = "a", DeletedOn = Now.AddDays(-1)
            },
            // Belongs to someone who isn't a recipient.
            RealDevice(4, userId: 99)
        }.AsAsyncQueryable());
        using var handler = new StubPushService(HttpStatusCode.Created);

        await CreateSender(credentials, handler).Send(Dispatch(1), TestContext.Current.CancellationToken);

        Assert.Equal(2, handler.Requests);
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Gone)]
    public async Task Send_WhenThePushServiceReportsTheEndpointGone_PrunesThatDevice(HttpStatusCode status)
    {
        using var credentials = TestVapid.Configured();
        var device = RealDevice(1);
        _deviceRepo.Query().Returns(new List<PushDevice> { device }.AsAsyncQueryable());
        using var handler = new StubPushService(status);

        await CreateSender(credentials, handler).Send(Dispatch(1), TestContext.Current.CancellationToken);

        Assert.Equal(Now, device.DeletedOn);
        _deviceRepo.Received(1).Update(device);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Send_WhenThePushServiceFailsTransiently_KeepsTheDevice()
    {
        // A 500 is not the browser dropping the subscription. Pruning here would
        // silently unsubscribe a real device over someone else's outage.
        using var credentials = TestVapid.Configured();
        var device = RealDevice(1);
        _deviceRepo.Query().Returns(new List<PushDevice> { device }.AsAsyncQueryable());
        using var handler = new StubPushService(HttpStatusCode.InternalServerError);

        await CreateSender(credentials, handler).Send(Dispatch(1), TestContext.Current.CancellationToken);

        Assert.Null(device.DeletedOn);
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }

    [Fact]
    public async Task Send_OneDeadDevice_DoesNotStopTheRest()
    {
        // All four share the stubbed status, so this really asserts the loop
        // keeps going after a throw rather than bailing on the first failure.
        using var credentials = TestVapid.Configured();
        var devices = new List<PushDevice> { RealDevice(1), RealDevice(2), RealDevice(3) };
        _deviceRepo.Query().Returns(devices.AsAsyncQueryable());
        using var handler = new StubPushService(HttpStatusCode.Gone);

        await CreateSender(credentials, handler).Send(Dispatch(1), TestContext.Current.CancellationToken);

        Assert.Equal(3, handler.Requests);
        Assert.All(devices, d => Assert.Equal(Now, d.DeletedOn));
        // One save for the whole batch, not one per device.
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    private WebPushSender CreateSender(VapidCredentials credentials) =>
        new(new PushServiceClient(), credentials, _deviceRepo, _unitOfWork, _time,
            NullLogger<WebPushSender>.Instance);

    private static VapidCredentials Unconfigured() => TestVapid.Unconfigured();

    private static PushDispatch Dispatch(params int[] userIds) =>
        new() { UserIds = userIds, Title = "Bin day moved" };

    [Fact]
    public async Task Send_WhenPushIsNotConfigured_DoesNothing()
    {
        using var credentials = Unconfigured();
        _deviceRepo.Query().Returns(new List<PushDevice>
        {
            new() { Id = 1, UserId = 1, Endpoint = "https://push.example/1", P256dhKey = "k", AuthKey = "a" }
        }.AsAsyncQueryable());

        await CreateSender(credentials).Send(Dispatch(1), TestContext.Current.CancellationToken);

        // Not even a device lookup: unconfigured means the feature is off, not
        // that sends fail one by one.
        _deviceRepo.DidNotReceive().Query();
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }

    [Fact]
    public async Task Send_WithNoRecipients_DoesNothing()
    {
        using var credentials = Unconfigured();

        await CreateSender(credentials).Send(Dispatch(), TestContext.Current.CancellationToken);

        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Gone)]
    public void IsGone_TreatsTheSpecsPermanentFailuresAsPermanent(HttpStatusCode statusCode)
    {
        Assert.True(WebPushSender.IsGone(statusCode));
    }

    [Theory]
    // Anything retryable or unrelated must NOT delete the device — pruning on a
    // transient 500 or a rate limit would silently unsubscribe real browsers.
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.RequestTimeout)]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.RequestEntityTooLarge)]
    public void IsGone_LeavesEverythingElseAlone(HttpStatusCode statusCode)
    {
        Assert.False(WebPushSender.IsGone(statusCode));
    }
}
