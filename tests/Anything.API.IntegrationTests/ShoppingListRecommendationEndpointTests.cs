using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class ShoppingListRecommendationEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private HttpClient? _userHttpClient;

    public ShoppingListRecommendationEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    private async Task<HttpClient> GetUserHttpClientAsync()
    {
        if (_userHttpClient == null)
        {
            // Register a regular user and log in
            var adminClient = await GetAuthenticatedHttpClientAsync();
            var inviteResponse = await adminClient.PostAsJsonAsync("/api/auth/invites", new { email = "user@test.com" });
            var inviteResult = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions);
            var inviteToken = inviteResult!.Token;

            await HttpClient.PostAsJsonAsync("/api/auth/register", new
            {
                email = "user@test.com",
                password = "User123!",
                name = "Test User",
                inviteToken
            });

            var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
            {
                email = "user@test.com",
                password = "User123!"
            });
            var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions);
            _userHttpClient = GetAuthenticatedHttpClient(loginResult!.AccessToken);
        }
        return _userHttpClient;
    }

    private async Task<int> CreateShoppingListAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/shopping-lists", new { name });
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions);
        return result!.Id;
    }

    private async Task AddShoppingListItemAsync(int listId, string itemName)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync($"/api/shopping-lists/{listId}/items", new { name = itemName });
    }

    private async Task CreateRecommendationViaRecipeAsync(string ingredientName)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var recipeResponse = await client.PostAsJsonAsync("/api/recipes", new { name = $"Test Recipe for {ingredientName}" });
        var recipe = await recipeResponse.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        await client.PostAsJsonAsync($"/api/recipes/{recipe!.Id}/ingredients",
            new { name = ingredientName, amount = 1.0, unit = (string?)null, group = (string?)null });
        var listId = await CreateShoppingListAsync($"Test List for {ingredientName}");
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = listId, multiplier = 1.0 });
    }

    // --- GET /api/shopping-list-recommendations ---

    [Fact]
    public async Task GetApprovedRecommendations_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetApprovedRecommendations_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/shopping-list-recommendations");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetApprovedRecommendations_OnlyReturnsApproved()
    {
        // Add an item manually - this no longer creates a pending recommendation
        var listId = await CreateShoppingListAsync("Test List");
        await AddShoppingListItemAsync(listId, "Milk");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        // No recommendations have been created or approved, so the list should be empty
        Assert.Empty(result);
    }

    // --- GET /api/shopping-list-recommendations/pending ---

    [Fact]
    public async Task GetPendingRecommendations_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations/pending");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetPendingRecommendations_RequiresAdminRole()
    {
        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.GetAsync("/api/shopping-list-recommendations/pending");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_DoesNotCreateRecommendation()
    {
        var listId = await CreateShoppingListAsync("Test List");
        await AddShoppingListItemAsync(listId, "Bread");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations/pending");
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.DoesNotContain(result, r => r.Name == "Bread");
    }

    // --- POST /api/shopping-list-recommendations/{id}/approve ---

    [Fact]
    public async Task ApproveRecommendation_ApprovesAndAppearsInApprovedList()
    {
        await CreateRecommendationViaRecipeAsync("Butter");

        var client = await GetAuthenticatedHttpClientAsync();
        var pendingResponse = await client.GetAsync("/api/shopping-list-recommendations/pending");
        var pending = await pendingResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        var recommendation = pending!.First(r => r.Name == "Butter");

        var approveResponse = await client.PostAsync($"/api/shopping-list-recommendations/{recommendation.Id}/approve", null);
        Assert.Equal(HttpStatusCode.NoContent, approveResponse.StatusCode);

        var approvedResponse = await client.GetAsync("/api/shopping-list-recommendations");
        var approved = await approvedResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);

        Assert.NotNull(approved);
        Assert.Contains(approved, r => r.Name == "Butter" && r.IsApproved);
    }

    [Fact]
    public async Task ApproveRecommendation_RequiresAdminRole()
    {
        await CreateRecommendationViaRecipeAsync("Cheese");

        var client = await GetAuthenticatedHttpClientAsync();
        var pendingResponse = await client.GetAsync("/api/shopping-list-recommendations/pending");
        var pending = await pendingResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        var recommendation = pending!.First(r => r.Name == "Cheese");

        var userClient = await GetUserHttpClientAsync();
        var approveResponse = await userClient.PostAsync($"/api/shopping-list-recommendations/{recommendation.Id}/approve", null);
        Assert.Equal(HttpStatusCode.Forbidden, approveResponse.StatusCode);
    }

    [Fact]
    public async Task ApproveRecommendation_ReturnsNotFoundForNonExistentId()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsync("/api/shopping-list-recommendations/99999/approve", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/shopping-list-recommendations/{id} ---

    [Fact]
    public async Task DeleteRecommendation_RemovesFromPendingList()
    {
        await CreateRecommendationViaRecipeAsync("Sugar");

        var client = await GetAuthenticatedHttpClientAsync();
        var pendingResponse = await client.GetAsync("/api/shopping-list-recommendations/pending");
        var pending = await pendingResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        var recommendation = pending!.First(r => r.Name == "Sugar");

        var deleteResponse = await client.DeleteAsync($"/api/shopping-list-recommendations/{recommendation.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var pendingAfterResponse = await client.GetAsync("/api/shopping-list-recommendations/pending");
        var pendingAfter = await pendingAfterResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(pendingAfter);
        Assert.DoesNotContain(pendingAfter, r => r.Name == "Sugar");
    }

    [Fact]
    public async Task DeleteRecommendation_RequiresAdminRole()
    {
        await CreateRecommendationViaRecipeAsync("Salt");

        var adminClient = await GetAuthenticatedHttpClientAsync();
        var pendingResponse = await adminClient.GetAsync("/api/shopping-list-recommendations/pending");
        var pending = await pendingResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        var recommendation = pending!.First(r => r.Name == "Salt");

        var userClient = await GetUserHttpClientAsync();
        var deleteResponse = await userClient.DeleteAsync($"/api/shopping-list-recommendations/{recommendation.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteRecommendation_ReturnsNotFoundForNonExistentId()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/shopping-list-recommendations/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private record LoginResponse(string AccessToken, string RefreshToken, string Email, string Name, string Role);
    private record InviteResponse(string InviteUrl, string Token);
    private record ShoppingListDto(int Id, string Name);
    private record RecipeDto(int Id, string Name);
    private record RecommendationDto(int Id, string? Name, bool IsApproved);
}
