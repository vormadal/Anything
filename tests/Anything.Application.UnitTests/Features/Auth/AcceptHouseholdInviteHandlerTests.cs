using Anything.Application.Features.Auth.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class AcceptHouseholdInviteHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<UserInvite> _inviteRepo = Substitute.For<IRepository<UserInvite>>();
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private AcceptHouseholdInviteHandler CreateHandler() =>
        new(_userRepo, _inviteRepo, _memberRepo, _unitOfWork, _timeProvider);

    public AcceptHouseholdInviteHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenTokenNotFound_ReturnsNotFound()
    {
        _inviteRepo.Query().Returns(new List<UserInvite>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("bad-token", 1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenInviteAlreadyUsed_ReturnsBadRequest()
    {
        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Token = "abc", Email = "user@example.com", IsUsed = true, ExpiresAt = DateTime.UtcNow.AddDays(3), CreatedByUserId = 2, CreatedOn = DateTime.UtcNow, HouseholdId = 99 }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("abc", 1), TestContext.Current.CancellationToken);

        Assert.IsType<ProblemHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenInviteExpired_ReturnsBadRequest()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Token = "abc", Email = "user@example.com", IsUsed = false, ExpiresAt = now.AddDays(-1).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("abc", 1), TestContext.Current.CancellationToken);

        Assert.IsType<ProblemHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenInviteHasNoHouseholdId_ReturnsBadRequest()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Token = "abc", Email = "user@example.com", IsUsed = false, ExpiresAt = now.AddDays(3).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = null }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("abc", 1), TestContext.Current.CancellationToken);

        Assert.IsType<ProblemHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsUnauthorized()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Token = "abc", Email = "user@example.com", IsUsed = false, ExpiresAt = now.AddDays(3).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 }
        }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("abc", 1), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenEmailMismatch_ReturnsForbid()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Token = "abc", Email = "invited@example.com", IsUsed = false, ExpiresAt = now.AddDays(3).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 }
        }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "different@example.com", Name = "User", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("abc", 1), TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenAlreadyMember_ReturnsBadRequest()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Token = "abc", Email = "user@example.com", IsUsed = false, ExpiresAt = now.AddDays(3).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 }
        }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "user@example.com", Name = "User", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());
        _memberRepo.Query().Returns(new List<HouseholdMember>
        {
            new() { HouseholdId = 99, UserId = 1, Role = HouseholdRoles.Member }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("abc", 1), TestContext.Current.CancellationToken);

        Assert.IsType<ProblemHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenValid_AddsMemberAndMarksInviteUsedAndReturnsOk()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        var invite = new UserInvite { Id = 1, Token = "abc", Email = "user@example.com", IsUsed = false, ExpiresAt = now.AddDays(3).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 };
        _inviteRepo.Query().Returns(new List<UserInvite> { invite }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "user@example.com", Name = "User", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());
        _memberRepo.Query().Returns(new List<HouseholdMember>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new AcceptHouseholdInviteCommand("abc", 1), TestContext.Current.CancellationToken);

        Assert.IsType<Ok>(result);
        Assert.True(invite.IsUsed);
        _memberRepo.Received(1).Add(Arg.Is<HouseholdMember>(m =>
            m.HouseholdId == 99 && m.UserId == 1 && m.Role == HouseholdRoles.Member));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
