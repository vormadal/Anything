using Anything.Application.Features.Households.Commands;
using Anything.Application.Notifications;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Households;

public class AddHouseholdMemberHandlerTests
{
    private readonly IRepository<Household> _householdRepo = Substitute.For<IRepository<Household>>();
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly INotificationDispatcher _notificationDispatcher = Substitute.For<INotificationDispatcher>();

    private AddHouseholdMemberHandler CreateHandler() =>
        new(_householdRepo, _memberRepo, _userRepo, _unitOfWork, _timeProvider, _notificationDispatcher);

    public AddHouseholdMemberHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
        _householdRepo.Query().Returns(new List<Household> { new() { Id = 1, Name = "Test" } }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 6, Email = "t@test.com", Name = "Target", Role = UserRoles.User, PasswordHash = "h" }
        }.AsAsyncQueryable());
    }

    private void SeedMembers(params HouseholdMember[] members) =>
        _memberRepo.Query().Returns(members.ToList().AsAsyncQueryable());

    [Fact]
    public async Task Handle_WhenRequesterIsPlainMember_ReturnsForbid()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Member });

        var result = await CreateHandler().Handle(
            new AddHouseholdMemberCommand(1, 6, HouseholdRoles.Member, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenAdminAddsMember_Succeeds()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Admin });

        var result = await CreateHandler().Handle(
            new AddHouseholdMemberCommand(1, 6, HouseholdRoles.Member, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<Created<HouseholdMember>>(result);
        _memberRepo.Received(1).Add(Arg.Is<HouseholdMember>(m => m.UserId == 6 && m.Role == HouseholdRoles.Member));
    }

    [Fact]
    public async Task Handle_WhenMemberAdded_NotifiesTheHouseholdExceptTheNewMember()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Admin });

        await CreateHandler().Handle(
            new AddHouseholdMemberCommand(1, 6, HouseholdRoles.Member, 5),
            TestContext.Current.CancellationToken);

        await _notificationDispatcher.Received(1).Dispatch(
            Arg.Is<NotificationDispatch>(d =>
                d.HouseholdId == 1
                && d.Category == NotificationCategories.HouseholdMember
                && d.Title == "Target joined the household"
                && d.LinkUrl == "/households/1"
                && d.CreatedByUserId == 5
                && d.ExcludeUserId == 6),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenAddRejected_DoesNotNotify()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Member });

        await CreateHandler().Handle(
            new AddHouseholdMemberCommand(1, 6, HouseholdRoles.Member, 5),
            TestContext.Current.CancellationToken);

        await _notificationDispatcher.DidNotReceiveWithAnyArgs()
            .Dispatch(default!, default);
    }

    [Fact]
    public async Task Handle_WhenAdminTriesToAddAnAdmin_ReturnsForbid()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Admin });

        var result = await CreateHandler().Handle(
            new AddHouseholdMemberCommand(1, 6, HouseholdRoles.Admin, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenOwnerAddsAnAdmin_Succeeds()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Owner });

        var result = await CreateHandler().Handle(
            new AddHouseholdMemberCommand(1, 6, HouseholdRoles.Admin, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<Created<HouseholdMember>>(result);
        _memberRepo.Received(1).Add(Arg.Is<HouseholdMember>(m => m.UserId == 6 && m.Role == HouseholdRoles.Admin));
    }
}
