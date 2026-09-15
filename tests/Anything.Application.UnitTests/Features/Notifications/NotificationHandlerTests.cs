using Anything.Application.Features.Notifications.Commands;
using Anything.Application.Features.Notifications.Queries;
using Anything.Application.Notifications;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Notifications;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Notifications;

/// <summary>
/// Shared doubles for the notification handlers. Every handler here is scoped by
/// household <em>and</em> recipient, so each fixture seeds rows that fail one of
/// those two filters — that isolation is the point of most of these tests.
/// </summary>
public abstract class NotificationHandlerTestBase
{
    protected const int HouseholdId = 7;
    protected const int UserId = 3;
    protected static readonly DateTime Now = new(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc);

    protected readonly IRepository<Notification> NotificationRepo = Substitute.For<IRepository<Notification>>();
    protected readonly IRepository<NotificationPreference> PreferenceRepo = Substitute.For<IRepository<NotificationPreference>>();
    protected readonly IUnitOfWork UnitOfWork = Substitute.For<IUnitOfWork>();
    protected readonly TimeProvider Time = Substitute.For<TimeProvider>();
    protected readonly IHouseholdContext HouseholdContext = Substitute.For<IHouseholdContext>();

    protected NotificationHandlerTestBase()
    {
        Time.GetUtcNow().Returns(new DateTimeOffset(Now, TimeSpan.Zero));
        HouseholdContext.HouseholdId.Returns(HouseholdId);
        SeedNotifications();
        SeedPreferences();
    }

    protected void SeedNotifications(params Notification[] notifications) =>
        NotificationRepo.Query().Returns(notifications.ToList().AsAsyncQueryable());

    protected void SeedPreferences(params NotificationPreference[] preferences) =>
        PreferenceRepo.Query().Returns(preferences.ToList().AsAsyncQueryable());

    protected static Notification Mine(int id, DateTime createdOn, DateTime? readOn = null, DateTime? deletedOn = null) =>
        new()
        {
            Id = id,
            HouseholdId = HouseholdId,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            Title = $"Notification {id}",
            CreatedOn = createdOn,
            ReadOn = readOn,
            DeletedOn = deletedOn
        };

    protected static Notification SomeoneElses(int id) =>
        new()
        {
            Id = id,
            HouseholdId = HouseholdId,
            UserId = UserId + 1,
            Category = NotificationCategories.Announcement,
            Title = "Not yours",
            CreatedOn = Now
        };

    protected static Notification OtherHousehold(int id) =>
        new()
        {
            Id = id,
            HouseholdId = HouseholdId + 1,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            Title = "Other household",
            CreatedOn = Now
        };
}

public class GetNotificationsHandlerTests : NotificationHandlerTestBase
{
    private GetNotificationsHandler CreateHandler() => new(NotificationRepo, HouseholdContext);

    [Fact]
    public async Task Handle_ReturnsOnlyTheCallersLiveNotifications_NewestFirst()
    {
        SeedNotifications(
            Mine(1, Now.AddDays(-2)),
            Mine(2, Now),
            Mine(3, Now.AddDays(-1), deletedOn: Now),
            SomeoneElses(4),
            OtherHousehold(5));

        var result = await CreateHandler().Handle(
            new GetNotificationsQuery(UserId), TestContext.Current.CancellationToken);

        Assert.Equal([2, 1], result.Select(n => n.Id).ToList());
    }

    [Fact]
    public async Task Handle_WhenUnreadOnly_ExcludesReadNotifications()
    {
        SeedNotifications(
            Mine(1, Now.AddDays(-1), readOn: Now),
            Mine(2, Now));

        var result = await CreateHandler().Handle(
            new GetNotificationsQuery(UserId, UnreadOnly: true), TestContext.Current.CancellationToken);

        Assert.Equal([2], result.Select(n => n.Id).ToList());
    }

    [Fact]
    public async Task Handle_AppliesTheRequestedLimit()
    {
        SeedNotifications(
            Mine(1, Now.AddDays(-2)),
            Mine(2, Now.AddDays(-1)),
            Mine(3, Now));

        var result = await CreateHandler().Handle(
            new GetNotificationsQuery(UserId, Limit: 2), TestContext.Current.CancellationToken);

        Assert.Equal([3, 2], result.Select(n => n.Id).ToList());
    }

    [Fact]
    public async Task Handle_CapsAnOversizedLimitAtMaxResults()
    {
        SeedNotifications(Enumerable.Range(1, GetNotificationsHandler.MaxResults + 20)
            .Select(i => Mine(i, Now.AddMinutes(-i)))
            .ToArray());

        var result = await CreateHandler().Handle(
            new GetNotificationsQuery(UserId, Limit: 5000), TestContext.Current.CancellationToken);

        Assert.Equal(GetNotificationsHandler.MaxResults, result.Count);
    }

    [Fact]
    public async Task Handle_WithNoLimit_StillCapsAtMaxResults()
    {
        SeedNotifications(Enumerable.Range(1, GetNotificationsHandler.MaxResults + 20)
            .Select(i => Mine(i, Now.AddMinutes(-i)))
            .ToArray());

        var result = await CreateHandler().Handle(
            new GetNotificationsQuery(UserId), TestContext.Current.CancellationToken);

        Assert.Equal(GetNotificationsHandler.MaxResults, result.Count);
    }
}

public class GetUnreadNotificationCountHandlerTests : NotificationHandlerTestBase
{
    [Fact]
    public async Task Handle_CountsOnlyTheCallersUnreadLiveNotifications()
    {
        SeedNotifications(
            Mine(1, Now),
            Mine(2, Now),
            Mine(3, Now, readOn: Now),
            Mine(4, Now, deletedOn: Now),
            SomeoneElses(5),
            OtherHousehold(6));

        var result = await new GetUnreadNotificationCountHandler(NotificationRepo, HouseholdContext)
            .Handle(new GetUnreadNotificationCountQuery(UserId), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.Count);
    }
}

public class MarkNotificationReadHandlerTests : NotificationHandlerTestBase
{
    private MarkNotificationReadHandler CreateHandler() =>
        new(NotificationRepo, HouseholdContext, UnitOfWork, Time);

    [Fact]
    public async Task Handle_SetsReadOn()
    {
        var notification = Mine(1, Now.AddDays(-1));
        SeedNotifications(notification);

        var result = await CreateHandler().Handle(
            new MarkNotificationReadCommand(UserId, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(Now, notification.ReadOn);
        await UnitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenAlreadyRead_KeepsTheOriginalTimestampAndDoesNotSave()
    {
        var readAt = Now.AddDays(-1);
        var notification = Mine(1, Now.AddDays(-2), readOn: readAt);
        SeedNotifications(notification);

        var result = await CreateHandler().Handle(
            new MarkNotificationReadCommand(UserId, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(readAt, notification.ReadOn);
        await UnitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }

    [Fact]
    public async Task Handle_WhenNotificationBelongsToAnotherMember_ReturnsNotFound()
    {
        SeedNotifications(SomeoneElses(1));

        var result = await CreateHandler().Handle(
            new MarkNotificationReadCommand(UserId, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenNotificationIsInAnotherHousehold_ReturnsNotFound()
    {
        SeedNotifications(OtherHousehold(1));

        var result = await CreateHandler().Handle(
            new MarkNotificationReadCommand(UserId, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }
}

public class MarkAllNotificationsReadHandlerTests : NotificationHandlerTestBase
{
    private MarkAllNotificationsReadHandler CreateHandler() =>
        new(NotificationRepo, HouseholdContext, UnitOfWork, Time);

    [Fact]
    public async Task Handle_MarksOnlyTheCallersUnreadNotifications()
    {
        var mineUnread = Mine(1, Now);
        var mineRead = Mine(2, Now, readOn: Now.AddDays(-1));
        var theirs = SomeoneElses(3);
        SeedNotifications(mineUnread, mineRead, theirs);

        var result = await CreateHandler().Handle(
            new MarkAllNotificationsReadCommand(UserId), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(Now, mineUnread.ReadOn);
        Assert.Equal(Now.AddDays(-1), mineRead.ReadOn);
        Assert.Null(theirs.ReadOn);
    }

    [Fact]
    public async Task Handle_WhenNothingUnread_DoesNotSave()
    {
        SeedNotifications(Mine(1, Now, readOn: Now));

        var result = await CreateHandler().Handle(
            new MarkAllNotificationsReadCommand(UserId), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        await UnitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }
}

public class DeleteNotificationHandlerTests : NotificationHandlerTestBase
{
    private DeleteNotificationHandler CreateHandler() =>
        new(NotificationRepo, HouseholdContext, UnitOfWork, Time);

    [Fact]
    public async Task Handle_SoftDeletes()
    {
        var notification = Mine(1, Now);
        SeedNotifications(notification);

        var result = await CreateHandler().Handle(
            new DeleteNotificationCommand(UserId, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(Now, notification.DeletedOn);
        await UnitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenNotificationBelongsToAnotherMember_ReturnsNotFound()
    {
        SeedNotifications(SomeoneElses(1));

        var result = await CreateHandler().Handle(
            new DeleteNotificationCommand(UserId, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }
}

public class GetNotificationPreferencesHandlerTests : NotificationHandlerTestBase
{
    private GetNotificationPreferencesHandler CreateHandler() => new(PreferenceRepo, HouseholdContext);

    [Fact]
    public async Task Handle_WhenNothingSaved_ReturnsEveryCategoryEnabled()
    {
        var result = await CreateHandler().Handle(
            new GetNotificationPreferencesQuery(UserId), TestContext.Current.CancellationToken);

        Assert.Equal(NotificationCategories.All, result.Select(p => p.Category).ToList());
        Assert.All(result, p => Assert.True(p.InAppEnabled));
        Assert.All(result, p => Assert.True(p.PushEnabled));
    }

    [Fact]
    public async Task Handle_ReportsTheTwoSwitchesIndependently()
    {
        SeedPreferences(new NotificationPreference
        {
            HouseholdId = HouseholdId,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            InAppEnabled = true,
            PushEnabled = false
        });

        var result = await CreateHandler().Handle(
            new GetNotificationPreferencesQuery(UserId), TestContext.Current.CancellationToken);

        var announcement = result.Single(p => p.Category == NotificationCategories.Announcement);
        Assert.True(announcement.InAppEnabled);
        Assert.False(announcement.PushEnabled);
    }

    [Fact]
    public async Task Handle_AppliesStoredOptOutsAndIgnoresOtherUsers()
    {
        SeedPreferences(
            new NotificationPreference
            {
                HouseholdId = HouseholdId,
                UserId = UserId,
                Category = NotificationCategories.Announcement,
                InAppEnabled = false
            },
            new NotificationPreference
            {
                HouseholdId = HouseholdId,
                UserId = UserId + 1,
                Category = NotificationCategories.HouseholdMember,
                InAppEnabled = false
            });

        var result = await CreateHandler().Handle(
            new GetNotificationPreferencesQuery(UserId), TestContext.Current.CancellationToken);

        Assert.False(result.Single(p => p.Category == NotificationCategories.Announcement).InAppEnabled);
        Assert.True(result.Single(p => p.Category == NotificationCategories.HouseholdMember).InAppEnabled);
    }
}

public class UpdateNotificationPreferencesHandlerTests : NotificationHandlerTestBase
{
    private UpdateNotificationPreferencesHandler CreateHandler() =>
        new(PreferenceRepo, HouseholdContext, UnitOfWork, Time);

    [Fact]
    public async Task Handle_InsertsAPreferenceWhenNoneExists()
    {
        var result = await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem(NotificationCategories.Announcement, false)]),
            TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        PreferenceRepo.Received(1).Add(Arg.Is<NotificationPreference>(p =>
            p.HouseholdId == HouseholdId
            && p.UserId == UserId
            && p.Category == NotificationCategories.Announcement
            && !p.InAppEnabled
            && p.CreatedOn == Now));
    }

    [Fact]
    public async Task Handle_UpdatesAnExistingPreference()
    {
        var existing = new NotificationPreference
        {
            Id = 1,
            HouseholdId = HouseholdId,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            InAppEnabled = true
        };
        SeedPreferences(existing);

        await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem(NotificationCategories.Announcement, false)]),
            TestContext.Current.CancellationToken);

        Assert.False(existing.InAppEnabled);
        Assert.Equal(Now, existing.ModifiedOn);
        PreferenceRepo.DidNotReceiveWithAnyArgs().Add(default!);
    }

    [Fact]
    public async Task Handle_WhenValueIsUnchanged_LeavesModifiedOnAlone()
    {
        var existing = new NotificationPreference
        {
            Id = 1,
            HouseholdId = HouseholdId,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            InAppEnabled = true
        };
        SeedPreferences(existing);

        await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem(NotificationCategories.Announcement, true)]),
            TestContext.Current.CancellationToken);

        Assert.Null(existing.ModifiedOn);
    }

    [Fact]
    public async Task Handle_TurningPushOffLeavesAStoredInAppChoiceAlone()
    {
        // The reason both switches are nullable: a client flipping one must not
        // silently reset the other to its default.
        var existing = new NotificationPreference
        {
            Id = 1,
            HouseholdId = HouseholdId,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            InAppEnabled = false,
            PushEnabled = true
        };
        SeedPreferences(existing);

        await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem(NotificationCategories.Announcement, PushEnabled: false)]),
            TestContext.Current.CancellationToken);

        Assert.False(existing.InAppEnabled);
        Assert.False(existing.PushEnabled);
    }

    [Fact]
    public async Task Handle_TurningInAppOffLeavesAStoredPushChoiceAlone()
    {
        var existing = new NotificationPreference
        {
            Id = 1,
            HouseholdId = HouseholdId,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            InAppEnabled = true,
            PushEnabled = false
        };
        SeedPreferences(existing);

        await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem(NotificationCategories.Announcement, InAppEnabled: false)]),
            TestContext.Current.CancellationToken);

        Assert.False(existing.InAppEnabled);
        Assert.False(existing.PushEnabled);
    }

    [Fact]
    public async Task Handle_InsertingWithOnlyOneSwitchLeavesTheOtherAtItsDefault()
    {
        await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem(NotificationCategories.Announcement, PushEnabled: false)]),
            TestContext.Current.CancellationToken);

        PreferenceRepo.Received(1).Add(Arg.Is<NotificationPreference>(p =>
            p.InAppEnabled && !p.PushEnabled));
    }

    [Fact]
    public async Task Handle_WithNeitherSwitchSupplied_ChangesNothing()
    {
        var existing = new NotificationPreference
        {
            Id = 1,
            HouseholdId = HouseholdId,
            UserId = UserId,
            Category = NotificationCategories.Announcement,
            InAppEnabled = false,
            PushEnabled = false
        };
        SeedPreferences(existing);

        await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem(NotificationCategories.Announcement)]),
            TestContext.Current.CancellationToken);

        Assert.Null(existing.ModifiedOn);
        PreferenceRepo.DidNotReceiveWithAnyArgs().Add(default!);
    }

    [Fact]
    public async Task Handle_RejectsAnUnknownCategoryWithoutWriting()
    {
        var result = await CreateHandler().Handle(
            new UpdateNotificationPreferencesCommand(UserId,
                [new NotificationPreferenceItem("not-a-category", false)]),
            TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        PreferenceRepo.DidNotReceiveWithAnyArgs().Add(default!);
        await UnitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }
}

public class SendHouseholdNotificationHandlerTests : NotificationHandlerTestBase
{
    private readonly INotificationDispatcher _dispatcher = Substitute.For<INotificationDispatcher>();

    private SendHouseholdNotificationHandler CreateHandler() => new(_dispatcher, HouseholdContext);

    [Fact]
    public async Task Handle_DispatchesAnAnnouncementExcludingTheSenderByDefault()
    {
        _dispatcher.Dispatch(Arg.Any<NotificationDispatch>(), Arg.Any<CancellationToken>()).Returns(4);

        var result = await CreateHandler().Handle(
            new SendHouseholdNotificationCommand(UserId, "Bin day moved", "Thursday.", IncludeSelf: false),
            TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<SendNotificationResponse>>(result);
        Assert.Equal(4, ok.Value!.Recipients);

        await _dispatcher.Received(1).Dispatch(
            Arg.Is<NotificationDispatch>(d =>
                d.HouseholdId == HouseholdId
                && d.Category == NotificationCategories.Announcement
                && d.Title == "Bin day moved"
                && d.Body == "Thursday."
                && d.LinkUrl == null
                && d.SourceKey == null
                && d.CreatedByUserId == UserId
                && d.ExcludeUserId == UserId),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenIncludeSelf_DoesNotExcludeTheSender()
    {
        await CreateHandler().Handle(
            new SendHouseholdNotificationCommand(UserId, "Bin day moved", null, IncludeSelf: true),
            TestContext.Current.CancellationToken);

        await _dispatcher.Received(1).Dispatch(
            Arg.Is<NotificationDispatch>(d => d.ExcludeUserId == null),
            Arg.Any<CancellationToken>());
    }
}
