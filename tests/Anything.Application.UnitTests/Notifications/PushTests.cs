using System.Net;
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

public class WebPushSenderTests
{
    private readonly IRepository<PushDevice> _deviceRepo = Substitute.For<IRepository<PushDevice>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _time = Substitute.For<TimeProvider>();

    public WebPushSenderTests()
    {
        _time.GetUtcNow().Returns(new DateTimeOffset(2026, 9, 15, 10, 0, 0, TimeSpan.Zero));
        _deviceRepo.Query().Returns(new List<PushDevice>().AsAsyncQueryable());
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
