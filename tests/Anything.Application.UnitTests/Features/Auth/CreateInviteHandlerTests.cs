using Anything.Application.Features.Auth.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Auth;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class CreateInviteHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<UserInvite> _inviteRepo = Substitute.For<IRepository<UserInvite>>();
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IRepository<Household> _householdRepo = Substitute.For<IRepository<Household>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private CreateInviteHandler CreateHandler() =>
        new(_userRepo, _inviteRepo, _memberRepo, _householdRepo, _unitOfWork, _timeProvider);

    public CreateInviteHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotAdmin_ReturnsForbid()
    {
        var result = await CreateHandler().Handle(new CreateInviteCommand("test@example.com", 1, UserRoles.User), TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenEmailAlreadyExists_ReturnsBadRequest()
    {
        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "existing@example.com", Name = "E", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateInviteCommand("existing@example.com", 1, UserRoles.Admin), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithValidRequest_CreatesInviteAndReturnsOk()
    {
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateInviteCommand("new@example.com", 1, UserRoles.Admin), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<CreateInviteResponse>>(result);
        Assert.NotNull(ok.Value);
        Assert.NotEmpty(ok.Value.Token);
        Assert.Contains("/register?token=", ok.Value.InviteUrl);
        _inviteRepo.Received(1).Add(Arg.Is<UserInvite>(i => i.Email == "new@example.com"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsInviteExpiryTo7DaysFromNow()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        await CreateHandler().Handle(new CreateInviteCommand("new@example.com", 1, UserRoles.Admin), TestContext.Current.CancellationToken);

        _inviteRepo.Received(1).Add(Arg.Is<UserInvite>(i =>
            i.ExpiresAt == now.AddDays(7).UtcDateTime));
    }

    [Fact]
    public async Task Handle_WithHouseholdId_WhenHouseholdDeleted_ReturnsNotFound()
    {
        _householdRepo.Query().Returns(new List<Household>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateInviteCommand("new@example.com", 1, UserRoles.Admin, HouseholdId: 99), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithHouseholdId_WhenAdminNotMember_ReturnsForbid()
    {
        _householdRepo.Query().Returns(new List<Household>
        {
            new() { Id = 99, Name = "Test" }
        }.AsAsyncQueryable());
        _memberRepo.Query().Returns(new List<HouseholdMember>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateInviteCommand("new@example.com", 1, UserRoles.Admin, HouseholdId: 99), TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithHouseholdId_WhenAdminIsMember_CreatesInviteWithHouseholdId()
    {
        _householdRepo.Query().Returns(new List<Household>
        {
            new() { Id = 99, Name = "Test" }
        }.AsAsyncQueryable());
        _memberRepo.Query().Returns(new List<HouseholdMember>
        {
            new() { HouseholdId = 99, UserId = 1, Role = HouseholdRoles.Member }
        }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateInviteCommand("new@example.com", 1, UserRoles.Admin, HouseholdId: 99), TestContext.Current.CancellationToken);

        Assert.IsType<Ok<CreateInviteResponse>>(result);
        _inviteRepo.Received(1).Add(Arg.Is<UserInvite>(i => i.HouseholdId == 99));
    }

    [Fact]
    public async Task Handle_WithHouseholdId_WhenNonAdminIsOwner_CreatesInvite()
    {
        _householdRepo.Query().Returns(new List<Household>
        {
            new() { Id = 99, Name = "Test" }
        }.AsAsyncQueryable());
        _memberRepo.Query().Returns(new List<HouseholdMember>
        {
            new() { HouseholdId = 99, UserId = 1, Role = HouseholdRoles.Owner }
        }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateInviteCommand("new@example.com", 1, UserRoles.User, HouseholdId: 99), TestContext.Current.CancellationToken);

        Assert.IsType<Ok<CreateInviteResponse>>(result);
        _inviteRepo.Received(1).Add(Arg.Is<UserInvite>(i => i.HouseholdId == 99));
    }

    [Fact]
    public async Task Handle_WithHouseholdId_WhenNonAdminIsNotOwner_ReturnsForbid()
    {
        _householdRepo.Query().Returns(new List<Household>
        {
            new() { Id = 99, Name = "Test" }
        }.AsAsyncQueryable());
        _memberRepo.Query().Returns(new List<HouseholdMember>
        {
            new() { HouseholdId = 99, UserId = 1, Role = HouseholdRoles.Member }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateInviteCommand("new@example.com", 1, UserRoles.User, HouseholdId: 99), TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }
}
