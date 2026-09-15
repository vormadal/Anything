using Anything.Application.Notifications;
using Anything.Application.Realtime;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Notifications;

public class NotificationDispatcherTests
{
    private readonly IRepository<Notification> _notificationRepo = Substitute.For<IRepository<Notification>>();
    private readonly IRepository<NotificationPreference> _preferenceRepo = Substitute.For<IRepository<NotificationPreference>>();
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();
    private readonly IPushDispatchQueue _pushQueue = Substitute.For<IPushDispatchQueue>();
    // Configured by default so the push assertions below exercise the real path;
    // the unconfigured case gets its own test.
    private readonly VapidCredentials _pushCredentials = TestVapid.Configured();
    private readonly List<Notification> _written = [];

    private static readonly DateTime Now = new(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc);

    public NotificationDispatcherTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(Now, TimeSpan.Zero));
        SeedMembers(1, 2, 3);
        SeedPreferences();
        SeedNotifications();
        _notificationRepo.AddRange(Arg.Do<IEnumerable<Notification>>(_written.AddRange));
    }

    private NotificationDispatcher CreateDispatcher() =>
        new(_notificationRepo, _preferenceRepo, _memberRepo, _unitOfWork, _timeProvider, _realtimeNotifier,
            _pushQueue, _pushCredentials);

    private void SeedMembers(params int[] userIds) =>
        _memberRepo.Query().Returns(userIds
            .Select(id => new HouseholdMember { HouseholdId = 7, UserId = id, Role = HouseholdRoles.Member })
            .Append(new HouseholdMember { HouseholdId = 99, UserId = 42, Role = HouseholdRoles.Member })
            .ToList()
            .AsAsyncQueryable());

    private void SeedPreferences(params NotificationPreference[] preferences) =>
        _preferenceRepo.Query().Returns(preferences.ToList().AsAsyncQueryable());

    private void SeedNotifications(params Notification[] notifications) =>
        _notificationRepo.Query().Returns(notifications.ToList().AsAsyncQueryable());

    private static NotificationDispatch Dispatch(
        IReadOnlyCollection<int>? recipients = null,
        int? excludeUserId = null,
        string? sourceKey = null) =>
        new()
        {
            HouseholdId = 7,
            Category = NotificationCategories.Announcement,
            Title = "Bin day moved",
            Body = "Thursday this week.",
            RecipientUserIds = recipients,
            ExcludeUserId = excludeUserId,
            SourceKey = sourceKey
        };

    private List<Notification> CapturedNotifications() => _written;

    [Fact]
    public async Task Dispatch_WithNoExplicitRecipients_FansOutToEveryHouseholdMember()
    {
        var created = await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        Assert.Equal(3, created);
        var written = CapturedNotifications();
        Assert.Equal([1, 2, 3], written.Select(n => n.UserId).Order().ToList());
        Assert.All(written, n =>
        {
            Assert.Equal(7, n.HouseholdId);
            Assert.Equal(NotificationCategories.Announcement, n.Category);
            Assert.Equal("Bin day moved", n.Title);
            Assert.Equal(Now, n.CreatedOn);
            Assert.Null(n.ReadOn);
        });
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Dispatch_NeverReachesAnotherHousehold()
    {
        await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        Assert.DoesNotContain(42, CapturedNotifications().Select(n => n.UserId));
    }

    [Fact]
    public async Task Dispatch_WithExplicitRecipients_DropsAnyWhoAreNotMembers()
    {
        var created = await CreateDispatcher().Dispatch(
            Dispatch(recipients: [2, 42, 1234]), TestContext.Current.CancellationToken);

        Assert.Equal(1, created);
        Assert.Equal([2], CapturedNotifications().Select(n => n.UserId).ToList());
    }

    [Fact]
    public async Task Dispatch_SkipsTheExcludedUser()
    {
        var created = await CreateDispatcher().Dispatch(
            Dispatch(excludeUserId: 2), TestContext.Current.CancellationToken);

        Assert.Equal(2, created);
        Assert.Equal([1, 3], CapturedNotifications().Select(n => n.UserId).Order().ToList());
    }

    [Fact]
    public async Task Dispatch_SkipsRecipientsWhoTurnedTheCategoryOff()
    {
        SeedPreferences(new NotificationPreference
        {
            HouseholdId = 7,
            UserId = 2,
            Category = NotificationCategories.Announcement,
            InAppEnabled = false
        });

        var created = await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        Assert.Equal(2, created);
        Assert.Equal([1, 3], CapturedNotifications().Select(n => n.UserId).Order().ToList());
    }

    [Fact]
    public async Task Dispatch_IgnoresAnOptOutForADifferentCategory()
    {
        SeedPreferences(new NotificationPreference
        {
            HouseholdId = 7,
            UserId = 2,
            Category = NotificationCategories.HouseholdMember,
            InAppEnabled = false
        });

        var created = await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        Assert.Equal(3, created);
    }

    [Fact]
    public async Task Dispatch_WithSourceKey_SkipsRecipientsWhoAlreadyHaveIt()
    {
        SeedNotifications(new Notification
        {
            Id = 1,
            HouseholdId = 7,
            UserId = 2,
            Category = NotificationCategories.Announcement,
            SourceKey = "bill:12:2026-09",
            Title = "Already sent"
        });

        var created = await CreateDispatcher().Dispatch(
            Dispatch(sourceKey: "bill:12:2026-09"), TestContext.Current.CancellationToken);

        Assert.Equal(2, created);
        Assert.Equal([1, 3], CapturedNotifications().Select(n => n.UserId).Order().ToList());
    }

    [Fact]
    public async Task Dispatch_WithSourceKey_TreatsADismissedNotificationAsAlreadyDelivered()
    {
        // The unique index spans soft-deleted rows, so redelivering here would be
        // a constraint violation rather than a helpful reminder.
        SeedNotifications(new Notification
        {
            Id = 1,
            HouseholdId = 7,
            UserId = 2,
            Category = NotificationCategories.Announcement,
            SourceKey = "bill:12:2026-09",
            Title = "Dismissed",
            DeletedOn = Now.AddDays(-1)
        });

        var created = await CreateDispatcher().Dispatch(
            Dispatch(sourceKey: "bill:12:2026-09"), TestContext.Current.CancellationToken);

        Assert.Equal(2, created);
        Assert.DoesNotContain(2, CapturedNotifications().Select(n => n.UserId));
    }

    [Fact]
    public async Task Dispatch_WithoutSourceKey_DoesNotDeduplicate()
    {
        SeedNotifications(new Notification
        {
            Id = 1,
            HouseholdId = 7,
            UserId = 2,
            Category = NotificationCategories.Announcement,
            Title = "Bin day moved"
        });

        var created = await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        Assert.Equal(3, created);
    }

    [Fact]
    public async Task Dispatch_WhenSomethingWasCreated_PushesOneContentlessRealtimeEvent()
    {
        await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        await _realtimeNotifier.Received(1).Notify(
            Arg.Is<SyncEvent>(e => e.Type == "notifications" && e.ListId == null),
            7,
            Arg.Any<CancellationToken>());
    }

    // --- push fan-out ---

    [Fact]
    public async Task Dispatch_QueuesAPushForEveryRecipientThatGotANotification()
    {
        await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        _pushQueue.Received(1).TryEnqueue(Arg.Is<PushDispatch>(p =>
            p.Title == "Bin day moved"
            && p.Body == "Thursday this week."
            && p.UserIds.OrderBy(id => id).SequenceEqual(new[] { 1, 2, 3 })));
    }

    [Fact]
    public async Task Dispatch_WhenPushIsNotConfigured_DoesNoPushWorkAtAll()
    {
        // Every deployment without VAPID keys takes this path on every single
        // dispatch, so it must not cost a preference lookup or a queue write.
        var credentials = TestVapid.Unconfigured();
        var dispatcher = new NotificationDispatcher(
            _notificationRepo, _preferenceRepo, _memberRepo, _unitOfWork, _timeProvider,
            _realtimeNotifier, _pushQueue, credentials);

        var created = await dispatcher.Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        // The in-app notification is untouched — push being off is not a veto.
        Assert.Equal(3, created);
        _pushQueue.DidNotReceiveWithAnyArgs().TryEnqueue(default!);
    }

    [Fact]
    public async Task Dispatch_SkipsPushForRecipientsWhoTurnedPushOff()
    {
        SeedPreferences(new NotificationPreference
        {
            HouseholdId = 7,
            UserId = 2,
            Category = NotificationCategories.Announcement,
            InAppEnabled = true,
            PushEnabled = false
        });

        var created = await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        // The notification itself is unaffected — push is a narrowing, not a veto.
        Assert.Equal(3, created);
        _pushQueue.Received(1).TryEnqueue(Arg.Is<PushDispatch>(p =>
            p.UserIds.OrderBy(id => id).SequenceEqual(new[] { 1, 3 })));
    }

    [Fact]
    public async Task Dispatch_QueuesNoPushWhenEveryRecipientTurnedPushOff()
    {
        SeedPreferences(
            new NotificationPreference { HouseholdId = 7, UserId = 1, Category = NotificationCategories.Announcement, PushEnabled = false },
            new NotificationPreference { HouseholdId = 7, UserId = 2, Category = NotificationCategories.Announcement, PushEnabled = false },
            new NotificationPreference { HouseholdId = 7, UserId = 3, Category = NotificationCategories.Announcement, PushEnabled = false });

        await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        _pushQueue.DidNotReceiveWithAnyArgs().TryEnqueue(default!);
    }

    [Fact]
    public async Task Dispatch_PushesOnlyToTheRecipientsWhoSurvivedTheInAppFilter()
    {
        // In-app off for user 2 means no row exists for them, so there is
        // nothing to push even though their push switch is untouched.
        SeedPreferences(new NotificationPreference
        {
            HouseholdId = 7,
            UserId = 2,
            Category = NotificationCategories.Announcement,
            InAppEnabled = false,
            PushEnabled = true
        });

        await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        _pushQueue.Received(1).TryEnqueue(Arg.Is<PushDispatch>(p =>
            p.UserIds.OrderBy(id => id).SequenceEqual(new[] { 1, 3 })));
    }

    [Fact]
    public async Task Dispatch_CarriesTheLinkThroughToThePush()
    {
        var dispatch = new NotificationDispatch
        {
            HouseholdId = 7,
            Category = NotificationCategories.HouseholdMember,
            Title = "Sam joined the household",
            LinkUrl = "/households/7"
        };

        await CreateDispatcher().Dispatch(dispatch, TestContext.Current.CancellationToken);

        _pushQueue.Received(1).TryEnqueue(Arg.Is<PushDispatch>(p => p.LinkUrl == "/households/7"));
    }

    [Fact]
    public async Task Dispatch_WhenEveryRecipientIsFilteredOut_WritesNothingAndStaysSilent()
    {
        SeedPreferences(
            new NotificationPreference { HouseholdId = 7, UserId = 1, Category = NotificationCategories.Announcement, InAppEnabled = false },
            new NotificationPreference { HouseholdId = 7, UserId = 2, Category = NotificationCategories.Announcement, InAppEnabled = false },
            new NotificationPreference { HouseholdId = 7, UserId = 3, Category = NotificationCategories.Announcement, InAppEnabled = false });

        var created = await CreateDispatcher().Dispatch(Dispatch(), TestContext.Current.CancellationToken);

        Assert.Equal(0, created);
        Assert.Empty(CapturedNotifications());
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
        await _realtimeNotifier.DidNotReceiveWithAnyArgs().Notify(default!, default, default);
        _pushQueue.DidNotReceiveWithAnyArgs().TryEnqueue(default!);
    }
}
