using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Anything.Application.Configuration;
using Anything.Application.Services;
using Anything.Core.Entities;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Services;

public class TokenServiceTests
{
    private static readonly JwtSettings Settings = new()
    {
        SecretKey = "test-secret-key-minimum-32-chars-long-enough",
        Issuer = "TestIssuer",
        Audience = "TestAudience",
        AccessTokenExpirationMinutes = 15
    };

    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private TokenService CreateService() => new(Options.Create(Settings), _timeProvider);

    [Fact]
    public void GenerateAccessToken_ContainsExpectedClaims()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
        var user = new User { Id = 42, Email = "test@test.com", Name = "Test User", Role = "Admin", PasswordHash = "" };

        var token = CreateService().GenerateAccessToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("42", jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("test@test.com", jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value);
        Assert.Equal("Test User", jwt.Claims.First(c => c.Type == ClaimTypes.Name).Value);
        Assert.Equal("Admin", jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal(Settings.Issuer, jwt.Issuer);
        Assert.Contains(Settings.Audience, jwt.Audiences);
    }

    [Fact]
    public void GenerateAccessToken_ExpiresAtConfiguredTime()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var user = new User { Id = 1, Email = "a@b.com", Name = "A", Role = "User", PasswordHash = "" };

        var token = CreateService().GenerateAccessToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal(now.AddMinutes(15).UtcDateTime, jwt.ValidTo, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsValidBase64Of64Bytes()
    {
        var token = CreateService().GenerateRefreshToken();

        Assert.NotEmpty(token);
        var bytes = Convert.FromBase64String(token);
        Assert.Equal(64, bytes.Length);
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsDifferentTokensEachCall()
    {
        var service = CreateService();

        var token1 = service.GenerateRefreshToken();
        var token2 = service.GenerateRefreshToken();

        Assert.NotEqual(token1, token2);
    }
}
