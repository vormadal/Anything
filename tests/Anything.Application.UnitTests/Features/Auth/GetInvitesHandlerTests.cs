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

public class GetInvitesHandlerTests
{
    private readonly IRepository<UserInvite> _inviteRepo = Substitute.For<IRepository<UserInvite>>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private GetInvitesHandler CreateHandler() => new(_inviteRepo, _timeProvider);

    public GetInvitesHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotAdmin_ReturnsForbid()
    {
        var result = await CreateHandler().Handle(new GetInvitesQuery(UserRoles.User));

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_AsAdmin_ReturnsOkWithInviteList()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Email = "a@b.com", Token = "tok", ExpiresAt = now.AddDays(7).UtcDateTime, CreatedOn = now.UtcDateTime }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetInvitesQuery(UserRoles.Admin));

        var ok = Assert.IsType<Ok<List<InviteResponse>>>(result);
        var invite = Assert.Single(ok.Value!);
        Assert.Equal("a@b.com", invite.Email);
        Assert.False(invite.IsExpired);
    }

    [Fact]
    public async Task Handle_WithExpiredInvite_SetsIsExpiredTrue()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        _inviteRepo.Query().Returns(new List<UserInvite>
        {
            new() { Id = 1, Email = "old@b.com", Token = "tok", ExpiresAt = now.AddDays(-1).UtcDateTime, CreatedOn = now.UtcDateTime }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetInvitesQuery(UserRoles.Admin));

        var ok = Assert.IsType<Ok<List<InviteResponse>>>(result);
        Assert.True(ok.Value![0].IsExpired);
    }

    [Fact]
    public async Task Handle_AsAdmin_ReturnsEmptyListWhenNoInvites()
    {
        _inviteRepo.Query().Returns(new List<UserInvite>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetInvitesQuery(UserRoles.Admin));

        var ok = Assert.IsType<Ok<List<InviteResponse>>>(result);
        Assert.Empty(ok.Value!);
    }
}
