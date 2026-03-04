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
            Id = 1, UserId = 10, Token = "old-refresh-token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc)
        };
        var user = new User { Id = 10, Email = "test@test.com", PasswordHash = "hash", Name = "Test", Role = "User" };

        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { oldToken }.AsAsyncQueryable());
        _userRepo.GetById(10).Returns(user);
        _tokenService.GenerateAccessToken(user).Returns("new-access-token");
        _tokenService.GenerateRefreshToken().Returns("new-refresh-token");

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("old-refresh-token"));

        Assert.IsType<Ok<Contracts.Auth.RefreshTokenResponse>>(result);
        var okResult = (Ok<Contracts.Auth.RefreshTokenResponse>)result;
        Assert.Equal("new-access-token", okResult.Value!.AccessToken);
        Assert.Equal("new-refresh-token", okResult.Value.RefreshToken);

        // Old token should be revoked
        Assert.True(oldToken.IsRevoked);

        // New refresh token should be persisted
        _refreshTokenRepo.Received(1).Add(Arg.Is<RefreshToken>(rt =>
            rt.UserId == 10 && rt.Token == "new-refresh-token"));
    }

    [Fact]
    public async Task Handle_WithInvalidToken_ReturnsUnauthorized()
    {
        _refreshTokenRepo.Query().Returns(new List<RefreshToken>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("bad-token"));

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithExpiredToken_ReturnsUnauthorized()
    {
        var expiredToken = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "expired-token",
            ExpiresAt = new DateTime(2026, 3, 2, 12, 0, 0, DateTimeKind.Utc) // Expired yesterday
        };
        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { expiredToken }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("expired-token"));

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithRevokedToken_ReturnsUnauthorized()
    {
        // Revoked tokens are filtered by the query (IsRevoked == false), so returns empty
        _refreshTokenRepo.Query().Returns(new List<RefreshToken>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("revoked-token"));

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenUserDeleted_ReturnsUnauthorized()
    {
        var token = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "valid-token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc)
        };
        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { token }.AsAsyncQueryable());

        var deletedUser = new User
        {
            Id = 10, Email = "test@test.com", PasswordHash = "hash",
            Name = "Test", Role = "User", DeletedOn = new DateTime(2026, 3, 3, 12, 0, 0, DateTimeKind.Utc)
        };
        _userRepo.GetById(10).Returns(deletedUser);

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("valid-token"));

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsUnauthorized()
    {
        var token = new RefreshToken
        {
            Id = 1, UserId = 10, Token = "valid-token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc)
        };
        _refreshTokenRepo.Query().Returns(new List<RefreshToken> { token }.AsAsyncQueryable());
        _userRepo.GetById(10).Returns((User?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand("valid-token"));

        Assert.IsType<UnauthorizedHttpResult>(result);
    }
}
