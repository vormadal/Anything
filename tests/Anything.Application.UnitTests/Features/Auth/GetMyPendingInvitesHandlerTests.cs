using Anything.Application.Features.Auth.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Auth;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class GetMyPendingInvitesHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<UserInvite> _inviteRepo = Substitute.For<IRepository<UserInvite>>();
    private readonly IRepository<Household> _householdRepo = Substitute.For<IRepository<Household>>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private GetMyPendingInvitesHandler CreateHandler() =>
        new(_userRepo, _inviteRepo, _householdRepo, _timeProvider);

    public GetMyPendingInvitesHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsUnauthorized()
    {
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetMyPendingInvitesQuery(99), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenNoPendingInvites_ReturnsEmptyList()
    {
        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "user@example.com", Name = "User", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());
        _inviteRepo.Query().Returns(new List<UserInvite>().AsAsyncQueryable());
        _householdRepo.Query().Returns(new List<Household>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetMyPendingInvitesQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<PendingInviteResponse>>>(result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task Handle_ReturnsPendingInvitesWithHouseholdName()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "user@example.com", Name = "User", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());
        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 10, Email = "user@example.com", Token = "abc", IsUsed = false, ExpiresAt = now.AddDays(3).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 }
        }.AsAsyncQueryable());
        _householdRepo.Query().Returns(new List<Household>
        {
            new() { Id = 99, Name = "Smith Family" }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetMyPendingInvitesQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<PendingInviteResponse>>>(result);
        var invite = Assert.Single(ok.Value!);
        Assert.Equal(10, invite.Id);
        Assert.Equal("abc", invite.Token);
        Assert.Equal(99, invite.HouseholdId);
        Assert.Equal("Smith Family", invite.HouseholdName);
        Assert.Contains("/register?token=abc", invite.InviteUrl);
    }

    [Fact]
    public async Task Handle_ExcludesUsedInvites()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "user@example.com", Name = "User", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());
        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 10, Email = "user@example.com", Token = "abc", IsUsed = true, ExpiresAt = now.AddDays(3).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 }
        }.AsAsyncQueryable());
        _householdRepo.Query().Returns(new List<Household>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetMyPendingInvitesQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<PendingInviteResponse>>>(result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task Handle_ExcludesExpiredInvites()
    {
        var now = new DateTimeOffset(2026, 6, 20, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        _userRepo.Query().Returns(new List<User>
        {
            new() { Id = 1, Email = "user@example.com", Name = "User", Role = "User", PasswordHash = "h" }
        }.AsAsyncQueryable());
        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 10, Email = "user@example.com", Token = "abc", IsUsed = false, ExpiresAt = now.AddDays(-1).UtcDateTime, CreatedByUserId = 2, CreatedOn = now.UtcDateTime, HouseholdId = 99 }
        }.AsAsyncQueryable());
        _householdRepo.Query().Returns(new List<Household>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetMyPendingInvitesQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<PendingInviteResponse>>>(result);
        Assert.Empty(ok.Value!);
    }
}
