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

    [Fact]
    public async Task Enqueued_ItemsComeBackInOrder()
    {
        var queue = new PushDispatchQueue();

        Assert.True(queue.TryEnqueue(Dispatch("first")));
        Assert.True(queue.TryEnqueue(Dispatch("second")));

        var read = new List<string>();
        using var cts = new CancellationTokenSource();
        await foreach (var item in queue.ReadAllAsync(cts.Token))
        {
            read.Add(item.Title);
            if (read.Count == 2) cts.Cancel();
        }

        Assert.Equal(["first", "second"], read);
    }

    [Fact]
    public void TryEnqueue_NeverBlocksOrThrows()
    {
        var queue = new PushDispatchQueue();

        // Well past the bounded capacity: the oldest items are dropped rather
        // than the producer being made to wait on a stalled push service.
        for (var i = 0; i < 5000; i++)
            Assert.True(queue.TryEnqueue(Dispatch($"item-{i}")));
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

    private static VapidCredentials Unconfigured() =>
        new(Options.Create(new PushSettings()));

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
