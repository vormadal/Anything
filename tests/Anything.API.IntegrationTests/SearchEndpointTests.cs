using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

/// <summary>
/// Exercises the cross-entity search index against a real Postgres instance —
/// the tsvector generated column + pg_trgm fallback combination in
/// SearchIndexService can't be verified without a real database (a translation
/// mistake wouldn't show up until the query actually executes), so these tests
/// are the primary safety net for that piece.
/// </summary>
public class SearchEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public SearchEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    private async Task<HttpClient> GetAuthenticatedHttpClientAsync()
    {
        if (_authenticatedHttpClient == null)
        {
            var token = await GetAdminTokenAsync();
            _authenticatedHttpClient = GetAuthenticatedHttpClient(token);
        }
        return _authenticatedHttpClient;
    }

    private async Task<RecipeDto> CreateRecipeAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/recipes", new { name, link = (string?)null, notes = (string?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private static async Task<List<SearchResultDto>> SearchAsync(HttpClient client, string term)
    {
        var response = await client.GetAsync($"/api/search?term={Uri.EscapeDataString(term)}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<List<SearchResultDto>>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    /// <summary>Registers and logs in a second, plain (non-admin) user who is a Member of <paramref name="householdId"/>.</summary>
    private async Task<HttpClient> CreateHouseholdMemberClientAsync(int householdId)
    {
        var adminToken = await GetAdminTokenAsync();
        var email = $"member-{Guid.NewGuid()}@test.local";

        var inviteRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/invites")
        {
            Content = JsonContent.Create(new { email, householdId })
        };
        inviteRequest.Headers.Add("Authorization", $"Bearer {adminToken}");
        var inviteResponse = await HttpClient.SendAsync(inviteRequest, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, inviteResponse.StatusCode);
        var invite = await inviteResponse.Content.ReadFromJsonAsync<CreateInviteResponseDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(invite);

        var registerResponse = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Member123!",
            name = "Test Member",
            inviteToken = invite.Token,
        }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Member123!",
        }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(login);

        var memberClient = Factory.CreateClient();
        memberClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {login.AccessToken}");
        memberClient.DefaultRequestHeaders.Add("X-Household-Id", householdId.ToString());
        return memberClient;
    }

    [Fact]
    public async Task Search_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/search?term=chicken", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Search_FindsRecipeByNameSubstring_ShortlyAfterCreation()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var recipe = await CreateRecipeAsync(client, "Chicken Curry");

        var results = await SearchAsync(client, "chicken");

        Assert.Contains(results, r => r.EntityType == "Recipe" && r.EntityId == recipe.Id);
    }

    [Fact]
    public async Task Search_IsTypoTolerant()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var recipe = await CreateRecipeAsync(client, "Chicken Curry");

        // "chickn" (missing an 'e') should still surface the recipe via the
        // pg_trgm word_similarity fallback.
        var results = await SearchAsync(client, "chickn");

        Assert.Contains(results, r => r.EntityType == "Recipe" && r.EntityId == recipe.Id);
    }

    [Fact]
    public async Task Search_ExcludesSoftDeletedRecipes()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var recipe = await CreateRecipeAsync(client, "Beef Stew");

        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var results = await SearchAsync(client, "beef");

        Assert.DoesNotContain(results, r => r.EntityType == "Recipe" && r.EntityId == recipe.Id);
    }

    [Fact]
    public async Task Search_IsHouseholdScoped()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var recipe = await CreateRecipeAsync(client, "Tomato Soup");

        var token = await GetAdminTokenAsync();
        var otherHouseholdClient = Factory.CreateClient();
        otherHouseholdClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        var createHouseholdResponse = await otherHouseholdClient.PostAsJsonAsync(
            "/api/households", new { name = "Other household" }, TestContext.Current.CancellationToken);
        var otherHousehold = await createHouseholdResponse.Content.ReadFromJsonAsync<HouseholdDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(otherHousehold);
        otherHouseholdClient.DefaultRequestHeaders.Add("X-Household-Id", otherHousehold.Id.ToString());

        var results = await SearchAsync(otherHouseholdClient, "tomato");

        Assert.DoesNotContain(results, r => r.EntityType == "Recipe" && r.EntityId == recipe.Id);
    }

    // --- Rebuild ---

    [Fact]
    public async Task RebuildIndex_AsGlobalAdmin_ReturnsIndexedCount()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await CreateRecipeAsync(client, "Lasagna");

        var response = await client.PostAsync("/api/search/rebuild-index", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RebuildResultDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.True(result.Indexed >= 1);
    }

    [Fact]
    public async Task RebuildIndex_RequiresGlobalAdminRole()
    {
        var memberClient = await CreateHouseholdMemberClientAsync(DefaultHouseholdId);

        var response = await memberClient.PostAsync("/api/search/rebuild-index", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RebuildHouseholdIndex_AllowsHouseholdOwner()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await CreateRecipeAsync(client, "Meatballs");

        var response = await client.PostAsync("/api/search/rebuild-index/household", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RebuildResultDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.True(result.Indexed >= 1);
    }

    [Fact]
    public async Task RebuildHouseholdIndex_RequiresHouseholdManager()
    {
        var memberClient = await CreateHouseholdMemberClientAsync(DefaultHouseholdId);

        var response = await memberClient.PostAsync("/api/search/rebuild-index/household", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RebuildHouseholdIndex_DoesNotIndexOtherHouseholds()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await CreateRecipeAsync(client, "Pancakes");

        var token = await GetAdminTokenAsync();
        var otherHouseholdClient = Factory.CreateClient();
        otherHouseholdClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        var createHouseholdResponse = await otherHouseholdClient.PostAsJsonAsync(
            "/api/households", new { name = "Empty household" }, TestContext.Current.CancellationToken);
        var otherHousehold = await createHouseholdResponse.Content.ReadFromJsonAsync<HouseholdDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(otherHousehold);
        otherHouseholdClient.DefaultRequestHeaders.Add("X-Household-Id", otherHousehold.Id.ToString());

        var response = await otherHouseholdClient.PostAsync("/api/search/rebuild-index/household", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RebuildResultDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(0, result.Indexed);

        var results = await SearchAsync(otherHouseholdClient, "pancakes");
        Assert.Empty(results);
    }

    private record RecipeDto(int Id, string? Name);
    private record HouseholdDto(int Id, string Name);
    private record SearchResultDto(string EntityType, int EntityId, string Title, string? Snippet);
    private record RebuildResultDto(int Indexed);
    private record CreateInviteResponseDto(string InviteUrl, string Token);
    private record LoginResponseDto(string AccessToken, string RefreshToken, string Email, string Name, string Role);
}
