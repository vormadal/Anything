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
        var response = await client.PostAsJsonAsync("/api/checklists", new { name });
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions);
        return result!.Id;
    }

    private async Task AddShoppingListItemAsync(int listId, string itemName)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync($"/api/checklists/{listId}/items", new { name = itemName });
    }

    private async Task<RecommendationDto> CreateRecommendationAsync(string name, string? preferredUnit = null)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/shopping-list-recommendations",
            new { name, preferredUnit });
        return (await response.Content.ReadFromJsonAsync<RecommendationDto>(JsonOptions))!;
    }

    // --- GET /api/shopping-list-recommendations ---

    [Fact]
    public async Task GetRecommendations_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetRecommendations_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/shopping-list-recommendations");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_CreatesRecommendation()
    {
        var listId = await CreateShoppingListAsync("Test List");
        await AddShoppingListItemAsync(listId, "Milk");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result, r => r.Name == "Milk");
    }

    // --- GET /api/shopping-list-recommendations/all ---

    [Fact]
    public async Task AddShoppingListItem_CreatesRecommendationInAllList()
    {
        var listId = await CreateShoppingListAsync("Test List");
        await AddShoppingListItemAsync(listId, "Bread");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations/all");
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Contains(result, r => r.Name == "Bread");
    }

    [Fact]
    public async Task AddShoppingListItem_DoesNotCreateDuplicateRecommendation()
    {
        var listId = await CreateShoppingListAsync("Test List");
        await AddShoppingListItemAsync(listId, "Eggs");

        var listId2 = await CreateShoppingListAsync("Test List 2");
        await AddShoppingListItemAsync(listId2, "eggs"); // lowercase - same item

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations/all");
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Single(result.Where(r => r.Name!.ToLower() == "eggs"));
    }

    [Fact]
    public async Task AddShoppingListItem_CreatesNewRecommendation_AfterExistingOneDeleted()
    {
        // Create and delete a recommendation
        var rec = await CreateRecommendationAsync("Flour");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.DeleteAsync($"/api/shopping-list-recommendations/{rec.Id}");

        // Adding a shopping list item with same name should create a new recommendation
        var listId = await CreateShoppingListAsync("Test List");
        await AddShoppingListItemAsync(listId, "Flour");

        var response = await client.GetAsync("/api/shopping-list-recommendations/all");
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result, r => r.Name == "Flour");
    }

    // --- GET /api/shopping-list-recommendations/uncategorized ---

    [Fact]
    public async Task GetUncategorizedRecommendations_ReturnsItemsWithoutCategory()
    {
        await CreateRecommendationAsync("Uncategorized Item");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations/uncategorized");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result, r => r.Name == "Uncategorized Item");
    }

    [Fact]
    public async Task GetUncategorizedRecommendations_ExcludesItemsWithCategory()
    {
        // Create a category
        var catResponse = await (await GetAuthenticatedHttpClientAsync())
            .PostAsJsonAsync("/api/suggestion-categories", new { name = "TestCat" });
        var category = await catResponse.Content.ReadFromJsonAsync<CategoryDto>(JsonOptions);

        // Create a recommendation and assign it to the category
        var rec = await CreateRecommendationAsync("Categorized Item");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PutAsJsonAsync($"/api/shopping-list-recommendations/{rec.Id}",
            new { name = rec.Name, preferredUnit = (string?)null, categoryId = category!.Id });

        var response = await client.GetAsync("/api/shopping-list-recommendations/uncategorized");
        var result = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.DoesNotContain(result, r => r.Name == "Categorized Item");
    }

    // --- DELETE /api/shopping-list-recommendations/{id} ---

    [Fact]
    public async Task DeleteRecommendation_RemovesFromApprovedList()
    {
        var listId = await CreateShoppingListAsync("Test List");
        await AddShoppingListItemAsync(listId, "Sugar");

        var client = await GetAuthenticatedHttpClientAsync();
        var allResponse = await client.GetAsync("/api/shopping-list-recommendations/all");
        var all = await allResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        var recommendation = all!.First(r => r.Name == "Sugar");

        var deleteResponse = await client.DeleteAsync($"/api/shopping-list-recommendations/{recommendation.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterResponse = await client.GetAsync("/api/shopping-list-recommendations");
        var after = await afterResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(after);
        Assert.DoesNotContain(after, r => r.Name == "Sugar");
    }

    [Fact]
    public async Task DeleteRecommendation_RequiresAdminRole()
    {
        var rec = await CreateRecommendationAsync("Salt");

        var userClient = await GetUserHttpClientAsync();
        var deleteResponse = await userClient.DeleteAsync($"/api/shopping-list-recommendations/{rec.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteRecommendation_ReturnsNotFoundForNonExistentId()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/shopping-list-recommendations/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- PUT /api/shopping-list-recommendations/{id} with CategoryId ---

    [Fact]
    public async Task UpdateRecommendation_AssignsCategory()
    {
        var rec = await CreateRecommendationAsync("Yogurt");

        var catResponse = await (await GetAuthenticatedHttpClientAsync())
            .PostAsJsonAsync("/api/suggestion-categories", new { name = "Dairy" });
        var category = await catResponse.Content.ReadFromJsonAsync<CategoryDto>(JsonOptions);

        var client = await GetAuthenticatedHttpClientAsync();
        var updateResponse = await client.PutAsJsonAsync($"/api/shopping-list-recommendations/{rec.Id}",
            new { name = "Yogurt", preferredUnit = (string?)null, categoryId = category!.Id });
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        // Should no longer appear in uncategorized
        var uncatResponse = await client.GetAsync("/api/shopping-list-recommendations/uncategorized");
        var uncat = await uncatResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(uncat);
        Assert.DoesNotContain(uncat, r => r.Name == "Yogurt");
    }

    [Fact]
    public async Task UpdateRecommendation_CanHideAndPromoteInSuggestions()
    {
        var rec = await CreateRecommendationAsync("Paprika");
        var client = await GetAuthenticatedHttpClientAsync();

        // Hide it from the suggestions feed.
        await client.PutAsJsonAsync($"/api/shopping-list-recommendations/{rec.Id}",
            new { name = "Paprika", preferredUnit = (string?)null, categoryId = (int?)null, includeInSuggestions = false });

        var hiddenResponse = await client.GetAsync("/api/shopping-list-recommendations");
        var hidden = await hiddenResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(hidden);
        Assert.DoesNotContain(hidden, r => r.Name == "Paprika");

        // Promote it back into suggestions.
        await client.PutAsJsonAsync($"/api/shopping-list-recommendations/{rec.Id}",
            new { name = "Paprika", preferredUnit = (string?)null, categoryId = (int?)null, includeInSuggestions = true });

        var promotedResponse = await client.GetAsync("/api/shopping-list-recommendations");
        var promoted = await promotedResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(promoted);
        Assert.Contains(promoted, r => r.Name == "Paprika");
    }

    // --- GET /api/shopping-list-recommendations/export ---

    [Fact]
    public async Task ExportRecommendations_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ExportDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
    }

    [Fact]
    public async Task ExportRecommendations_ReturnsApprovedRecommendations()
    {
        await CreateRecommendationAsync("Milk", "L");
        await CreateRecommendationAsync("Bread");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-list-recommendations/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ExportDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result.Recommendations, r => r.Name == "Milk" && r.PreferredUnit == "L");
        Assert.Contains(result.Recommendations, r => r.Name == "Bread");
    }

    [Fact]
    public async Task ExportRecommendations_IncludesCategoryName()
    {
        var catResponse = await (await GetAuthenticatedHttpClientAsync())
            .PostAsJsonAsync("/api/suggestion-categories", new { name = "Beverages" });
        var category = await catResponse.Content.ReadFromJsonAsync<CategoryDto>(JsonOptions);

        var rec = await CreateRecommendationAsync("Juice");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PutAsJsonAsync($"/api/shopping-list-recommendations/{rec.Id}",
            new { name = "Juice", preferredUnit = (string?)null, categoryId = category!.Id });

        var response = await client.GetAsync("/api/shopping-list-recommendations/export");
        var result = await response.Content.ReadFromJsonAsync<ExportDto>(JsonOptions);
        Assert.NotNull(result);
        var juice = result.Recommendations.FirstOrDefault(r => r.Name == "Juice");
        Assert.NotNull(juice);
        Assert.Equal("Beverages", juice.Category);
    }

    [Fact]
    public async Task ExportRecommendations_WhenUncategorizedOnly_ReturnsOnlyUncategorizedRecommendations()
    {
        var catResponse = await (await GetAuthenticatedHttpClientAsync())
            .PostAsJsonAsync("/api/suggestion-categories", new { name = "Beverages" });
        var category = await catResponse.Content.ReadFromJsonAsync<CategoryDto>(JsonOptions);

        await CreateRecommendationAsync("Uncategorized Item");
        var categorized = await CreateRecommendationAsync("Categorized Item");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PutAsJsonAsync($"/api/shopping-list-recommendations/{categorized.Id}",
            new { name = "Categorized Item", preferredUnit = (string?)null, categoryId = category!.Id });

        var response = await client.GetAsync("/api/shopping-list-recommendations/export?uncategorizedOnly=true");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ExportDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result.Recommendations, r => r.Name == "Uncategorized Item");
        Assert.DoesNotContain(result.Recommendations, r => r.Name == "Categorized Item");
    }

    [Fact]
    public async Task ExportRecommendations_RequiresAdminRole()
    {
        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.GetAsync("/api/shopping-list-recommendations/export");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- POST /api/shopping-list-recommendations/import ---

    [Fact]
    public async Task ImportRecommendations_AddsNewRecommendations()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var importResponse = await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new { recommendations = new[] { new { name = "Tomato", preferredUnit = "kg" } } });
        Assert.Equal(HttpStatusCode.NoContent, importResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/shopping-list-recommendations");
        var result = await getResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result, r => r.Name == "Tomato");
    }

    [Fact]
    public async Task ImportRecommendations_UpdatesExistingRecommendations()
    {
        var rec = await CreateRecommendationAsync("Carrot");

        var client = await GetAuthenticatedHttpClientAsync();
        var importResponse = await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new { recommendations = new[] { new { name = "Carrot", preferredUnit = "bunch" } } });
        Assert.Equal(HttpStatusCode.NoContent, importResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/shopping-list-recommendations/all");
        var result = await getResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        // Still only one Carrot entry, but now with preferredUnit
        Assert.Single(result.Where(r => r.Name == "Carrot"));
    }

    [Fact]
    public async Task ImportRecommendations_CreatesNewCategoryIfMissing()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var importResponse = await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new
            {
                recommendations = new[]
                {
                    new { name = "Salmon", preferredUnit = (string?)null, category = "Fish" }
                }
            });
        Assert.Equal(HttpStatusCode.NoContent, importResponse.StatusCode);

        // The "Fish" category should have been created automatically
        var catResponse = await client.GetAsync("/api/suggestion-categories");
        var categories = await catResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(categories);
        Assert.Contains(categories, c => c.Name == "Fish");

        // And the recommendation should be assigned to it
        var uncatResponse = await client.GetAsync("/api/shopping-list-recommendations/uncategorized");
        var uncat = await uncatResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(uncat);
        Assert.DoesNotContain(uncat, r => r.Name == "Salmon");
    }

    [Fact]
    public async Task ImportRecommendations_UsesExistingCategoryIfPresent()
    {
        var catResponse = await (await GetAuthenticatedHttpClientAsync())
            .PostAsJsonAsync("/api/suggestion-categories", new { name = "Grains" });
        catResponse.EnsureSuccessStatusCode();

        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new
            {
                recommendations = new[]
                {
                    new { name = "Rice", preferredUnit = (string?)null, category = "Grains" }
                }
            });

        // Only one "Grains" category should exist
        var catGetResponse = await client.GetAsync("/api/suggestion-categories");
        var categories = await catGetResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(categories);
        Assert.Single(categories.Where(c => c.Name == "Grains"));
    }

    [Fact]
    public async Task ImportRecommendations_WithNullCategory_RecommendationRemainsUncategorized()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new { recommendations = new[] { new { name = "Pepper", preferredUnit = (string?)null, category = (string?)null } } });

        var uncatResponse = await client.GetAsync("/api/shopping-list-recommendations/uncategorized");
        var uncat = await uncatResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(uncat);
        Assert.Contains(uncat, r => r.Name == "Pepper");
    }

    [Fact]
    public async Task ImportRecommendations_WithDeleteTrue_RemovesExistingRecommendation()
    {
        await CreateRecommendationAsync("Butter");

        var client = await GetAuthenticatedHttpClientAsync();
        var importResponse = await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new { recommendations = new[] { new { name = "Butter", delete = true } } });
        Assert.Equal(HttpStatusCode.NoContent, importResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/shopping-list-recommendations");
        var result = await getResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.DoesNotContain(result, r => r.Name == "Butter");
    }

    [Fact]
    public async Task ImportRecommendations_WithDeleteTrue_DoesNotCreateNewRecommendation()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var importResponse = await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new
            {
                recommendations = new[]
                {
                    new { name = "NeverCreated", category = "Temporary", delete = true }
                }
            });
        Assert.Equal(HttpStatusCode.NoContent, importResponse.StatusCode);

        var recommendationResponse = await client.GetAsync("/api/shopping-list-recommendations");
        var recommendations = await recommendationResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(recommendations);
        Assert.DoesNotContain(recommendations, r => r.Name == "NeverCreated");

        var categoryResponse = await client.GetAsync("/api/suggestion-categories");
        var categories = await categoryResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(categories);
        Assert.DoesNotContain(categories, c => c.Name == "Temporary");
    }

    [Fact]
    public async Task ImportRecommendations_RequiresAdminRole()
    {
        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new { recommendations = new[] { new { name = "Test" } } });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ImportRecommendations_WithEmptyList_ReturnsNoContent()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/shopping-list-recommendations/import",
            new { recommendations = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // --- GET /api/shopping-list-recommendations/search ---

    [Fact]
    public async Task SearchRecommendations_RanksSubstringMatchesFirst()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await CreateRecommendationAsync("Milk");
        await CreateRecommendationAsync("Oat milk");
        await CreateRecommendationAsync("Butter");

        var response = await client.GetAsync("/api/shopping-list-recommendations/search?query=milk");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(results);

        var names = results.Select(r => r.Name).ToList();
        Assert.Contains("Milk", names);
        Assert.Contains("Oat milk", names);
        Assert.DoesNotContain("Butter", names);
        // Prefix match ("Milk") ranks before the mid-string match ("Oat milk").
        Assert.True(names.IndexOf("Milk") < names.IndexOf("Oat milk"));
    }

    [Fact]
    public async Task SearchRecommendations_ToleratesTypo()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await CreateRecommendationAsync("Tomato");
        await CreateRecommendationAsync("Cucumber");

        // "tomatoe" is a common misspelling; substring LIKE would miss it.
        var response = await client.GetAsync("/api/shopping-list-recommendations/search?query=tomatoe");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(results);

        Assert.Contains(results, r => r.Name == "Tomato");
        Assert.DoesNotContain(results, r => r.Name == "Cucumber");
    }

    [Fact]
    public async Task SearchRecommendations_BlankQuery_ReturnsAlphabeticalList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        await CreateRecommendationAsync("Banana");
        await CreateRecommendationAsync("Apple");

        var response = await client.GetAsync("/api/shopping-list-recommendations/search");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = await response.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(results);

        var names = results.Select(r => r.Name).ToList();
        Assert.True(names.IndexOf("Apple") < names.IndexOf("Banana"));
    }

    [Fact]
    public async Task SearchRecommendations_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/shopping-list-recommendations/search?query=milk");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SearchRecommendations_ExcludesHiddenRecommendations()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var hidden = await CreateRecommendationAsync("Zucchini");
        await client.PutAsJsonAsync($"/api/shopping-list-recommendations/{hidden.Id}",
            new { name = "Zucchini", preferredUnit = (string?)null, categoryId = (int?)null, includeInSuggestions = false });
        await CreateRecommendationAsync("Zesty Lime");

        // Non-blank query: a substring match on a hidden recommendation must not surface.
        var searchResponse = await client.GetAsync("/api/shopping-list-recommendations/search?query=zu");
        var searchResults = await searchResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(searchResults);
        Assert.DoesNotContain(searchResults, r => r.Name == "Zucchini");

        // Blank query: the alphabetical fallback list must also exclude it.
        var blankResponse = await client.GetAsync("/api/shopping-list-recommendations/search");
        var blankResults = await blankResponse.Content.ReadFromJsonAsync<RecommendationDto[]>(JsonOptions);
        Assert.NotNull(blankResults);
        Assert.DoesNotContain(blankResults, r => r.Name == "Zucchini");
        Assert.Contains(blankResults, r => r.Name == "Zesty Lime");
    }

    private record LoginResponse(string AccessToken, string RefreshToken, string Email, string Name, string Role);
    private record InviteResponse(string InviteUrl, string Token);
    private record ShoppingListDto(int Id, string Name);
    private record RecommendationDto(int Id, string? Name, int? CategoryId = null, bool IncludeInSuggestions = true);
    private record CategoryDto(int Id, string Name, int SortOrder);
    private record ExportDto(List<ExportRecommendationItem> Recommendations);
    private record ExportRecommendationItem(string Name, string? PreferredUnit, string? Category);
}
