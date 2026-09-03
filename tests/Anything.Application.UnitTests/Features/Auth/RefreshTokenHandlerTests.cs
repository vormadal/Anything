using Anything.Application.Features.Auth.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class RefreshTokenHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<RefreshToken> _refreshTokenRepo = Substitute.For<IRepository<RefreshToken>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ITokenService _tokenService = Substitute.For<ITokenService>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private RefreshTokenHandler CreateHandler() =>
        new(_userRepo, _refreshTokenRepo, _unitOfWork, _tokenService, _timeProvider);

    public RefreshTokenHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 3, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WithValidToken_RotatesTokensAndReturnsNewPair()
    {
        var oldToken = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "hashed-old-refresh-token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc)
        };
        var user = new User { Id = 10, Email = "test@test.com", PasswordHash = "hash", Name = "Test", Role = "User" };

        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { oldToken }.AsAsyncQueryable());
        _userRepo.GetById(10).Returns(user);
        _tokenService.GenerateAccessToken(user).Returns("new-access-token");
        _tokenService.GenerateRefreshToken().Returns("new-refresh-token");
        _tokenService.HashRefreshToken("old-refresh-token").Returns("hashed-old-refresh-token");
        _tokenService.HashRefreshToken("new-refresh-token").Returns("hashed-new-refresh-token");

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("old-refresh-token"), TestContext.Current.CancellationToken);

        Assert.IsType<Ok<Contracts.Auth.RefreshTokenResponse>>(result);
        var okResult = (Ok<Contracts.Auth.RefreshTokenResponse>)result;
        Assert.Equal("new-access-token", okResult.Value!.AccessToken);
        // The response carries the raw new token; only its hash is persisted.
        Assert.Equal("new-refresh-token", okResult.Value.RefreshToken);

        // Old token should be revoked
        Assert.True(oldToken.IsRevoked);

        // New refresh token should be persisted, hashed
        _refreshTokenRepo.Received(1).Add(Arg.Is<RefreshToken>(rt =>
            rt.UserId == 10 && rt.Token == "hashed-new-refresh-token"));
    }

    [Fact]
    public async Task Handle_OnRotation_PrunesOtherDeadTokensForTheSameUser()
    {
        var now = new DateTimeOffset(2026, 3, 3, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        var activeToken = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "hashed-old-refresh-token",
            ExpiresAt = now.AddDays(1).UtcDateTime
        };
        var revokedToken = new RefreshToken
        {
            Id = 2, UserId = 10, Token = "revoked-hash",
            ExpiresAt = now.AddDays(1).UtcDateTime, IsRevoked = true
        };
        var expiredToken = new RefreshToken
        {
            Id = 3, UserId = 10, Token = "expired-hash",
            ExpiresAt = now.AddDays(-1).UtcDateTime
        };
        var otherUsersDeadToken = new RefreshToken
        {
            Id = 4, UserId = 99, Token = "other-user-hash",
            ExpiresAt = now.AddDays(-1).UtcDateTime
        };
        var user = new User { Id = 10, Email = "test@test.com", PasswordHash = "hash", Name = "Test", Role = "User" };

        var allTokens = new List<RefreshToken> { activeToken, revokedToken, expiredToken, otherUsersDeadToken };
        _refreshTokenRepo.Query().Returns(_ => allTokens.AsAsyncQueryable());
        _userRepo.GetById(10).Returns(user);
        _tokenService.GenerateAccessToken(user).Returns("new-access-token");
        _tokenService.GenerateRefreshToken().Returns("new-refresh-token");
        _tokenService.HashRefreshToken("old-refresh-token").Returns("hashed-old-refresh-token");
        _tokenService.HashRefreshToken("new-refresh-token").Returns("hashed-new-refresh-token");

        var handler = CreateHandler();
        await handler.Handle(new RefreshTokenCommand("old-refresh-token"), TestContext.Current.CancellationToken);

        // Revoked and expired rows for this user are swept…
        _refreshTokenRepo.Received(1).Remove(revokedToken);
        _refreshTokenRepo.Received(1).Remove(expiredToken);
        // …but not the row just revoked in this call, and not another user's row.
        _refreshTokenRepo.DidNotReceive().Remove(activeToken);
        _refreshTokenRepo.DidNotReceive().Remove(otherUsersDeadToken);
    }

    [Fact]
    public async Task Handle_WithInvalidToken_ReturnsUnauthorized()
    {
        _refreshTokenRepo.Query().Returns(new List<RefreshToken>().AsAsyncQueryable());
        _tokenService.HashRefreshToken("bad-token").Returns("hashed-bad-token");

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("bad-token"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithExpiredToken_ReturnsUnauthorized()
    {
        var expiredToken = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "hashed-expired-token",
            ExpiresAt = new DateTime(2026, 3, 2, 12, 0, 0, DateTimeKind.Utc) // Expired yesterday
        };
        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { expiredToken }.AsAsyncQueryable());
        _tokenService.HashRefreshToken("expired-token").Returns("hashed-expired-token");

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("expired-token"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithRevokedToken_ReturnsUnauthorized()
    {
        // Revoked tokens are filtered by the query (IsRevoked == false), so returns empty
        _refreshTokenRepo.Query().Returns(new List<RefreshToken>().AsAsyncQueryable());
        _tokenService.HashRefreshToken("revoked-token").Returns("hashed-revoked-token");

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("revoked-token"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenUserDeleted_ReturnsUnauthorized()
    {
        var token = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "hashed-valid-token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc)
        };
        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { token }.AsAsyncQueryable());
        _tokenService.HashRefreshToken("valid-token").Returns("hashed-valid-token");

        var deletedUser = new User
        {
            Id = 10, Email = "test@test.com", PasswordHash = "hash",
            Name = "Test", Role = "User", DeletedOn = new DateTime(2026, 3, 3, 12, 0, 0, DateTimeKind.Utc)
        };
        _userRepo.GetById(10).Returns(deletedUser);

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("valid-token"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsUnauthorized()
    {
        var token = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "hashed-valid-token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc)
        };
        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { token }.AsAsyncQueryable());
        _tokenService.HashRefreshToken("valid-token").Returns("hashed-valid-token");
        _userRepo.GetById(10).Returns((User?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("valid-token"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }
}
