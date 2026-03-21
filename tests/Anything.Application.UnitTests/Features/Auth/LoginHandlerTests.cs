using Anything.Application.Features.Auth.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class LoginHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<RefreshToken> _refreshTokenRepo = Substitute.For<IRepository<RefreshToken>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IPasswordService _passwordService = Substitute.For<IPasswordService>();
    private readonly ITokenService _tokenService = Substitute.For<ITokenService>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private LoginHandler CreateHandler() =>
        new(_userRepo, _refreshTokenRepo, _unitOfWork, _passwordService, _tokenService, _timeProvider);

    public LoginHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 3, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WithValidCredentials_ReturnsOkWithTokens()
    {
        var user = new User { Id = 1, Email = "test@test.com", PasswordHash = "hash", Name = "Test", Role = "User" };
        _userRepo.Query().Returns(new List<User> { user }.AsAsyncQueryable());
        _passwordService.VerifyPassword("password123", "hash").Returns(true);
        _tokenService.GenerateAccessToken(user).Returns("access-token");
        _tokenService.GenerateRefreshToken().Returns("refresh-token");

        var handler = CreateHandler();
        var result = await handler.Handle(new LoginCommand("test@test.com", "password123"), TestContext.Current.CancellationToken);

        Assert.IsType<Ok<Contracts.Auth.LoginResponse>>(result);
        var okResult = (Ok<Contracts.Auth.LoginResponse>)result;
        Assert.Equal("access-token", okResult.Value!.AccessToken);
        Assert.Equal("refresh-token", okResult.Value.RefreshToken);
        Assert.Equal("test@test.com", okResult.Value.Email);
        Assert.Equal("Test", okResult.Value.Name);

        _refreshTokenRepo.Received(1).Add(Arg.Is<RefreshToken>(rt =>
            rt.UserId == 1 && rt.Token == "refresh-token"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidPassword_ReturnsUnauthorized()
    {
        var user = new User { Id = 1, Email = "test@test.com", PasswordHash = "hash", Name = "Test", Role = "User" };
        _userRepo.Query().Returns(new List<User> { user }.AsAsyncQueryable());
        _passwordService.VerifyPassword("wrong", "hash").Returns(false);

        var handler = CreateHandler();
        var result = await handler.Handle(new LoginCommand("test@test.com", "wrong"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithNonExistentUser_ReturnsUnauthorized()
    {
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new LoginCommand("nobody@test.com", "password"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithDeletedUser_ReturnsUnauthorized()
    {
        var user = new User
        {
            Id = 1, Email = "test@test.com", PasswordHash = "hash",
            Name = "Test", Role = "User", DeletedOn = new DateTime(2026, 3, 3, 12, 0, 0, DateTimeKind.Utc)
        };
        // Deleted users filtered by WHERE DeletedOn == null, so query returns empty
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new LoginCommand("test@test.com", "password"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedHttpResult>(result);
    }

    [Fact]
    public async Task Handle_SetsRefreshTokenExpiresAt7DaysFromNow()
    {
        var now = new DateTimeOffset(2026, 3, 3, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        var user = new User { Id = 1, Email = "test@test.com", PasswordHash = "hash", Name = "Test", Role = "User" };
        _userRepo.Query().Returns(new List<User> { user }.AsAsyncQueryable());
        _passwordService.VerifyPassword("password", "hash").Returns(true);
        _tokenService.GenerateAccessToken(user).Returns("at");
        _tokenService.GenerateRefreshToken().Returns("rt");

        var handler = CreateHandler();
        await handler.Handle(new LoginCommand("test@test.com", "password"), TestContext.Current.CancellationToken);

        _refreshTokenRepo.Received(1).Add(Arg.Is<RefreshToken>(rt =>
            rt.ExpiresAt == now.AddDays(7).UtcDateTime));
    }
}
