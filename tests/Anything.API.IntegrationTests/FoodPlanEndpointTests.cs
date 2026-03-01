using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class FoodPlanEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public FoodPlanEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/food-plans ---

    [Fact]
    public async Task GetFoodPlans_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/food-plans");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetFoodPlans_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/food-plans");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetFoodPlans_ReturnsCreatedFoodPlans()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        await CreateFoodPlanAsync("Week 1", weekStart);
        await CreateFoodPlanAsync("Week 2", weekStart.AddDays(7));

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/food-plans");
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Equal(2, result.Length);
        Assert.Contains(result, p => p.Name == "Week 1");
        Assert.Contains(result, p => p.Name == "Week 2");
    }

    [Fact]
    public async Task GetFoodPlans_DoesNotReturnDeletedFoodPlans()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Deleted Plan", weekStart);
        var client = await GetAuthenticatedHttpClientAsync();
        await client.DeleteAsync($"/api/food-plans/{plan.Id}");

        var response = await client.GetAsync("/api/food-plans");
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/food-plans/{id} ---

    [Fact]
    public async Task GetFoodPlanById_ReturnsFoodPlan()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/food-plans/{plan.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(plan.Id, result.Id);
        Assert.Equal("Week Plan", result.Name);
    }

    [Fact]
    public async Task GetFoodPlanById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/food-plans/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/food-plans ---

    [Fact]
    public async Task CreateFoodPlan_ReturnsFoodPlan()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("New Plan", weekStart);

        Assert.True(plan.Id > 0);
        Assert.Equal("New Plan", plan.Name);
    }

    [Fact]
    public async Task CreateFoodPlan_WithEmptyName_Returns400()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/food-plans",
            new { name = "", weekStart = DateTime.UtcNow });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/food-plans/{id} ---

    [Fact]
    public async Task UpdateFoodPlan_ReturnsNoContent()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Old Name", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync($"/api/food-plans/{plan.Id}",
            new { name = "New Name", weekStart = weekStart.AddDays(7) });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateFoodPlan_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync("/api/food-plans/99999",
            new { name = "Name", weekStart = DateTime.UtcNow });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/food-plans/{id} ---

    [Fact]
    public async Task DeleteFoodPlan_ReturnsNoContent()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("To Delete", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync($"/api/food-plans/{plan.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteFoodPlan_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/food-plans/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/food-plans/{id}/entries ---

    [Fact]
    public async Task AddFoodPlanEntry_WithRecipe_ReturnsCreated()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);
        var recipe = await CreateRecipeAsync("Pasta");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Pasta Dinner", recipeId = recipe.Id, dayOfWeek = 0 });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var entry = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions);
        Assert.NotNull(entry);
        Assert.Equal(recipe.Id, entry.RecipeId);
        Assert.Equal(0, entry.DayOfWeek);
        Assert.Equal("Pasta Dinner", entry.Name);
    }

    [Fact]
    public async Task AddFoodPlanEntry_WithName_ReturnsCreated()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Homemade Salad", dayOfWeek = 1 });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var entry = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions);
        Assert.NotNull(entry);
        Assert.Equal("Homemade Salad", entry.Name);
        Assert.Equal(1, entry.DayOfWeek);
    }

    [Fact]
    public async Task AddFoodPlanEntry_WithoutName_Returns400()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { dayOfWeek = 0 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddFoodPlanEntry_WhenFoodPlanNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/food-plans/99999/entries",
            new { name = "Test", dayOfWeek = 0 });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/food-plans/{id}/entries ---

    [Fact]
    public async Task GetFoodPlanEntries_ReturnsEntries()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);
        var recipe = await CreateRecipeAsync("Pizza");

        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Pizza Dinner", recipeId = recipe.Id, dayOfWeek = 0 });
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Salad", dayOfWeek = 1 });

        var response = await client.GetAsync($"/api/food-plans/{plan.Id}/entries");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var entries = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto[]>(JsonOptions);
        Assert.NotNull(entries);
        Assert.Equal(2, entries.Length);
    }

    // --- DELETE /api/food-plans/{id}/entries/{entryId} ---

    [Fact]
    public async Task DeleteFoodPlanEntry_ReturnsNoContent()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var createResponse = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Salad", dayOfWeek = 0 });
        var entry = await createResponse.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions);
        Assert.NotNull(entry);

        var deleteResponse = await client.DeleteAsync($"/api/food-plans/{plan.Id}/entries/{entry.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    // --- POST /api/food-plans/{id}/add-to-shopping-list ---

    [Fact]
    public async Task AddFoodPlanToShoppingList_AddsIngredients()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);
        var recipe = await CreateRecipeAsync("Spaghetti Bolognese");

        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Spaghetti", amount = 200, unit = "g" });
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Minced Beef", amount = 400, unit = "g" });
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Spaghetti Dinner", recipeId = recipe.Id, dayOfWeek = 0 });

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" });
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{shoppingList.Id}/items");
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenFoodPlanNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "My List" });
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plans/99999/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Helpers ---

    private async Task<FoodPlanDto> CreateFoodPlanAsync(string name, DateTime weekStart)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/food-plans", new { name, weekStart });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto>(JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private async Task<RecipeDto> CreateRecipeAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private record FoodPlanDto(int Id, string? Name, DateTime WeekStart);
    private record FoodPlanEntryDto(int Id, int FoodPlanId, int? RecipeId, string? Name, int DayOfWeek);
    private record RecipeDto(int Id, string? Name);
    private record ShoppingListDto(int Id, string? Name);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked);
}
