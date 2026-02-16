using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class AuthEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public AuthEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    // --- POST /api/auth/login ---

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsTokens()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@anything.local",
            password = "Admin123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions);
        Assert.NotNull(result);
        Assert.NotEmpty(result.AccessToken);
        Assert.NotEmpty(result.RefreshToken);
        Assert.Equal("admin@anything.local", result.Email);
        Assert.Equal("Administrator", result.Name);
        Assert.Equal("Admin", result.Role);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_Returns401()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@anything.local",
            password = "WrongPassword"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithNonExistentUser_Returns401()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "nonexistent@example.com",
            password = "SomePassword"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/auth/refresh ---

    [Fact]
    public async Task RefreshToken_WithValidToken_ReturnsNewTokens()
    {
        var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@anything.local",
            password = "Admin123!"
        });

        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions);
        Assert.NotNull(loginResult);

        var refreshResponse = await HttpClient.PostAsJsonAsync("/api/auth/refresh", new
        {
            refreshToken = loginResult.RefreshToken
        });

        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        
        var refreshResult = await refreshResponse.Content.ReadFromJsonAsync<RefreshTokenResponse>(JsonOptions);
        Assert.NotNull(refreshResult);
        Assert.NotEmpty(refreshResult.AccessToken);
        Assert.NotEmpty(refreshResult.RefreshToken);
        Assert.NotEqual(loginResult.AccessToken, refreshResult.AccessToken);
    }

    [Fact]
    public async Task RefreshToken_WithInvalidToken_Returns401()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/refresh", new
        {
            refreshToken = "invalid-token"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/auth/invites (Admin only) ---

    [Fact]
    public async Task CreateInvite_AsAdmin_CreatesInvite()
    {
        var token = await LoginAsAdminAsync();

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/invites")
        {
            Content = JsonContent.Create(new { email = "newuser@example.com" })
        };
        request.Headers.Add("Authorization", $"Bearer {token}");

        var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var result = await response.Content.ReadFromJsonAsync<CreateInviteResponse>(JsonOptions);
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Contains("/register?token=", result.InviteUrl);
    }

    [Fact]
    public async Task CreateInvite_WithoutAuth_Returns401()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/invites", new
        {
            email = "newuser@example.com"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/auth/register ---

    [Fact]
    public async Task Register_WithValidInvite_CreatesUser()
    {
        var token = await LoginAsAdminAsync();

        var inviteRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/invites")
        {
            Content = JsonContent.Create(new { email = "testuser@example.com" })
        };
        inviteRequest.Headers.Add("Authorization", $"Bearer {token}");

        var inviteResponse = await HttpClient.SendAsync(inviteRequest);
        var invite = await inviteResponse.Content.ReadFromJsonAsync<CreateInviteResponse>(JsonOptions);
        Assert.NotNull(invite);

        var registerResponse = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "testuser@example.com",
            password = "TestPass123!",
            name = "Test User",
            inviteToken = invite.Token
        });

        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);
    }

    [Fact]
    public async Task Register_WithInvalidToken_Returns400()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "test@example.com",
            password = "TestPass123!",
            name = "Test User",
            inviteToken = "invalid-token"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithMismatchedEmail_Returns400()
    {
        var token = await LoginAsAdminAsync();

        var inviteRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/invites")
        {
            Content = JsonContent.Create(new { email = "invited@example.com" })
        };
        inviteRequest.Headers.Add("Authorization", $"Bearer {token}");

        var inviteResponse = await HttpClient.SendAsync(inviteRequest);
        var invite = await inviteResponse.Content.ReadFromJsonAsync<CreateInviteResponse>(JsonOptions);
        Assert.NotNull(invite);

        var registerResponse = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "different@example.com",
            password = "TestPass123!",
            name = "Test User",
            inviteToken = invite.Token
        });

        Assert.Equal(HttpStatusCode.BadRequest, registerResponse.StatusCode);
    }

    // --- Helper Methods ---

    private async Task<string> LoginAsAdminAsync()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@anything.local",
            password = "Admin123!"
        });

        var result = await response.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions);
        Assert.NotNull(result);
        return result.AccessToken;
    }

    private record LoginResponse(
        string AccessToken,
        string RefreshToken,
        string Email,
        string Name,
        string Role);

    private record RefreshTokenResponse(
        string AccessToken,
        string RefreshToken);

    private record CreateInviteResponse(
        string InviteUrl,
        string Token);
}
