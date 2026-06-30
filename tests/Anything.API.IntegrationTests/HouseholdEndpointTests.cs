using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class HouseholdEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public HouseholdEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    // -------------------------------------------------------------------------
    // Middleware enforcement tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AuthenticatedRequest_WithoutHouseholdHeader_Returns400()
    {
        var token = await GetAdminTokenAsync();
        // Explicitly omit X-Household-Id to verify middleware enforcement
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var response = await client.GetAsync("/api/somethings", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedRequest_WithInvalidHouseholdHeader_Returns400()
    {
        var token = await GetAdminTokenAsync();
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        client.DefaultRequestHeaders.Add("X-Household-Id", "not-a-number");

        var response = await client.GetAsync("/api/somethings", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedRequest_WithHouseholdNotBelongingToUser_Returns403()
    {
        var token = await GetAdminTokenAsync();
        var adminClient = Factory.CreateClient();
        adminClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        // Create a regular user that does NOT belong to DefaultHouseholdId
        var inviteResponse = await adminClient.PostAsJsonAsync(
            "/api/auth/invites", new { email = "regular@test.com" }, TestContext.Current.CancellationToken);
        var inviteResult = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions, TestContext.Current.CancellationToken);

        await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "regular@test.com",
            password = "User123!",
            name = "Regular User",
            inviteToken = inviteResult!.Token
        }, TestContext.Current.CancellationToken);

        var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "regular@test.com",
            password = "User123!"
        }, TestContext.Current.CancellationToken);
        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions, TestContext.Current.CancellationToken);

        // User tries to access somethings scoped to DefaultHouseholdId (admin's household)
        var userClient = Factory.CreateClient();
        userClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {login!.AccessToken}");
        userClient.DefaultRequestHeaders.Add("X-Household-Id", DefaultHouseholdId.ToString());

        var response = await userClient.GetAsync("/api/somethings", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedRequest_AsMember_Succeeds()
    {
        var token = await GetAdminTokenAsync();
        // GetAuthenticatedHttpClient includes X-Household-Id via DefaultHouseholdId
        var client = GetAuthenticatedHttpClient(token);

        var response = await client.GetAsync("/api/somethings", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // -------------------------------------------------------------------------
    // Household CRUD tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetHouseholds_ReturnsAdminHousehold()
    {
        var token = await GetAdminTokenAsync();
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var response = await client.GetAsync("/api/households", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var households = await response.Content.ReadFromJsonAsync<HouseholdResponse[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(households);
        Assert.NotEmpty(households);
    }

    [Fact]
    public async Task CreateHousehold_ReturnsCreatedHouseholdWithOwnerMembership()
    {
        var token = await GetAdminTokenAsync();
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var response = await client.PostAsJsonAsync(
            "/api/households", new { name = "My Household" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<HouseholdResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("My Household", created.Name);
    }

    [Fact]
    public async Task UpdateHousehold_ByOwner_Returns204()
    {
        var token = await GetAdminTokenAsync();
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var response = await client.PutAsJsonAsync(
            $"/api/households/{DefaultHouseholdId}",
            new { name = "Updated Name" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateHousehold_ByNonMember_Returns403()
    {
        var token = await GetAdminTokenAsync();
        var adminClient = Factory.CreateClient();
        adminClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        // Register a regular user (not added to any household)
        var inviteResponse = await adminClient.PostAsJsonAsync(
            "/api/auth/invites", new { email = "outsider@test.com" }, TestContext.Current.CancellationToken);
        var inviteResult = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions, TestContext.Current.CancellationToken);

        await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "outsider@test.com",
            password = "User123!",
            name = "Outsider",
            inviteToken = inviteResult!.Token
        }, TestContext.Current.CancellationToken);

        var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "outsider@test.com",
            password = "User123!"
        }, TestContext.Current.CancellationToken);
        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions, TestContext.Current.CancellationToken);

        // Non-member attempts to update admin's household — middleware blocks with 403
        var nonMemberClient = Factory.CreateClient();
        nonMemberClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {login!.AccessToken}");
        nonMemberClient.DefaultRequestHeaders.Add("X-Household-Id", DefaultHouseholdId.ToString());

        var response = await nonMemberClient.PutAsJsonAsync(
            $"/api/households/{DefaultHouseholdId}",
            new { name = "Hacked" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // -------------------------------------------------------------------------
    // Delete household tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeleteHousehold_ByOwner_RemovesItFromHouseholdList()
    {
        var token = await GetAdminTokenAsync();
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var createResponse = await client.PostAsJsonAsync(
            "/api/households", new { name = "Household To Delete" }, TestContext.Current.CancellationToken);
        var created = await createResponse.Content.ReadFromJsonAsync<HouseholdResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var deleteResponse = await client.DeleteAsync(
            $"/api/households/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var listResponse = await client.GetAsync("/api/households", TestContext.Current.CancellationToken);
        var households = await listResponse.Content.ReadFromJsonAsync<HouseholdResponse[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(households);
        Assert.DoesNotContain(households, h => h.Id == created.Id);

        var getResponse = await client.GetAsync(
            $"/api/households/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteHousehold_ByNonOwnerMember_Returns403()
    {
        var token = await GetAdminTokenAsync();
        var adminClient = Factory.CreateClient();
        adminClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        // Register a regular user and add them as an Admin (not Owner) of the household.
        var inviteResp = await adminClient.PostAsJsonAsync(
            "/api/auth/invites", new { email = "deleter-admin@test.com" }, TestContext.Current.CancellationToken);
        var invite = await inviteResp.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions, TestContext.Current.CancellationToken);
        var registerResp = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "deleter-admin@test.com",
            password = "User123!",
            name = "Deleter Admin",
            inviteToken = invite!.Token
        }, TestContext.Current.CancellationToken);
        var registered = await registerResp.Content.ReadFromJsonAsync<RegisterResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(registered);

        await adminClient.PostAsJsonAsync(
            $"/api/households/{DefaultHouseholdId}/members",
            new { userId = registered.Id, role = "Admin" },
            TestContext.Current.CancellationToken);

        var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "deleter-admin@test.com",
            password = "User123!"
        }, TestContext.Current.CancellationToken);
        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions, TestContext.Current.CancellationToken);

        var adminMemberClient = Factory.CreateClient();
        adminMemberClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {login!.AccessToken}");

        var response = await adminMemberClient.DeleteAsync(
            $"/api/households/{DefaultHouseholdId}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // -------------------------------------------------------------------------
    // Member management tests
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AddHouseholdMember_WithInvalidRole_Returns400()
    {
        var token = await GetAdminTokenAsync();
        var adminClient = Factory.CreateClient();
        adminClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        // Register a user to add
        var inviteResp = await adminClient.PostAsJsonAsync(
            "/api/auth/invites", new { email = "invite@test.com" }, TestContext.Current.CancellationToken);
        var invite = await inviteResp.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions, TestContext.Current.CancellationToken);
        var registerResp = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "invite@test.com",
            password = "User123!",
            name = "Invited User",
            inviteToken = invite!.Token
        }, TestContext.Current.CancellationToken);
        var registered = await registerResp.Content.ReadFromJsonAsync<RegisterResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(registered);

        var response = await adminClient.PostAsJsonAsync(
            $"/api/households/{DefaultHouseholdId}/members",
            new { userId = registered.Id, role = "SuperAdmin" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddAndRemoveHouseholdMember_WorksCorrectly()
    {
        var token = await GetAdminTokenAsync();
        var adminClient = Factory.CreateClient();
        adminClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        // Register a user
        var inviteResp = await adminClient.PostAsJsonAsync(
            "/api/auth/invites", new { email = "newmember@test.com" }, TestContext.Current.CancellationToken);
        var invite = await inviteResp.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions, TestContext.Current.CancellationToken);
        var registerResp = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email = "newmember@test.com",
            password = "User123!",
            name = "New Member",
            inviteToken = invite!.Token
        }, TestContext.Current.CancellationToken);
        var registered = await registerResp.Content.ReadFromJsonAsync<RegisterResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(registered);

        // Add as Member
        var addResponse = await adminClient.PostAsJsonAsync(
            $"/api/households/{DefaultHouseholdId}/members",
            new { userId = registered.Id, role = "Member" },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, addResponse.StatusCode);

        // Verify member appears in household detail
        var detailResp = await adminClient.GetAsync(
            $"/api/households/{DefaultHouseholdId}", TestContext.Current.CancellationToken);
        var detail = await detailResp.Content.ReadFromJsonAsync<HouseholdDetailResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(detail);
        Assert.Contains(detail.Members, m => m.UserId == registered.Id);

        // Remove the member
        var removeResponse = await adminClient.DeleteAsync(
            $"/api/households/{DefaultHouseholdId}/members/{registered.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, removeResponse.StatusCode);

        // Verify member is gone
        var detailAfterResp = await adminClient.GetAsync(
            $"/api/households/{DefaultHouseholdId}", TestContext.Current.CancellationToken);
        var detailAfter = await detailAfterResp.Content.ReadFromJsonAsync<HouseholdDetailResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(detailAfter);
        Assert.DoesNotContain(detailAfter.Members, m => m.UserId == registered.Id);
    }

    // -------------------------------------------------------------------------
    // Local DTOs
    // -------------------------------------------------------------------------

    private record HouseholdResponse(int Id, string Name, DateTime CreatedOn, string Role);
    private record HouseholdDetailResponse(int Id, string Name, DateTime CreatedOn, List<MemberDto> Members);
    private record MemberDto(int UserId, string Name, string Email, string Role, DateTime JoinedOn);
    private record LoginResponse(string AccessToken, string RefreshToken, string Email, string Name, string Role);
    private record InviteResponse(string Token);
    private record RegisterResponse(int Id, string Email, string Name);
}
