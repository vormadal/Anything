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
        var response = await client.GetAsync("/api/food-plans", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetFoodPlans_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/food-plans", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetFoodPlans_ReturnsCreatedFoodPlans()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        await CreateFoodPlanAsync("Week 1", weekStart);
        await CreateFoodPlanAsync("Week 2", weekStart.AddDays(7));

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/food-plans", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto[]>(JsonOptions, TestContext.Current.CancellationToken);

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
        await client.DeleteAsync($"/api/food-plans/{plan.Id}", TestContext.Current.CancellationToken);

        var response = await client.GetAsync("/api/food-plans", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto[]>(JsonOptions, TestContext.Current.CancellationToken);

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
        var response = await client.GetAsync($"/api/food-plans/{plan.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(plan.Id, result.Id);
        Assert.Equal("Week Plan", result.Name);
    }

    [Fact]
    public async Task GetFoodPlanById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/food-plans/99999", TestContext.Current.CancellationToken);
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
            new { name = "", weekStart = new DateTime(2025, 1, 6, 0, 0, 0, DateTimeKind.Utc) }, TestContext.Current.CancellationToken);
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
            new { name = "New Name", weekStart = weekStart.AddDays(7) }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateFoodPlan_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync("/api/food-plans/99999",
            new { name = "Name", weekStart = new DateTime(2025, 1, 6, 0, 0, 0, DateTimeKind.Utc) }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/food-plans/{id} ---

    [Fact]
    public async Task DeleteFoodPlan_ReturnsNoContent()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("To Delete", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync($"/api/food-plans/{plan.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteFoodPlan_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/food-plans/99999", TestContext.Current.CancellationToken);
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
            new { name = "Pasta Dinner", recipeId = recipe.Id, dayOfWeek = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var entry = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);
        Assert.Equal(recipe.Id, entry.RecipeId);
        Assert.Equal(0, entry.DayOfWeek);
        Assert.Equal("Pasta Dinner", entry.Name);
    }

    [Fact]
    public async Task AddFoodPlanEntry_WithoutRecipeId_AutoCreatesRecipe()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Homemade Salad", dayOfWeek = 1 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var entry = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);
        Assert.Equal("Homemade Salad", entry.Name);
        Assert.Equal(1, entry.DayOfWeek);
        Assert.NotNull(entry.RecipeId);

        var recipeResponse = await client.GetAsync($"/api/recipes/{entry.RecipeId}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, recipeResponse.StatusCode);
        var recipe = await recipeResponse.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(recipe);
        Assert.Equal("Homemade Salad", recipe.Name);
    }

    [Fact]
    public async Task AddFoodPlanEntry_WithoutName_Returns400()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { dayOfWeek = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddFoodPlanEntry_WhenFoodPlanNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/food-plans/99999/entries",
            new { name = "Test", dayOfWeek = 0 }, TestContext.Current.CancellationToken);
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
            new { name = "Pizza Dinner", recipeId = recipe.Id, dayOfWeek = 0 }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Salad", dayOfWeek = 1 }, TestContext.Current.CancellationToken);

        var response = await client.GetAsync($"/api/food-plans/{plan.Id}/entries", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var entries = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto[]>(JsonOptions, TestContext.Current.CancellationToken);
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
            new { name = "Salad", dayOfWeek = 0 }, TestContext.Current.CancellationToken);
        var entry = await createResponse.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);

        var deleteResponse = await client.DeleteAsync($"/api/food-plans/{plan.Id}/entries/{entry.Id}", TestContext.Current.CancellationToken);
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
            new { name = "Spaghetti", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Minced Beef", amount = 400, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Spaghetti Dinner", recipeId = recipe.Id, dayOfWeek = 0 }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Spaghetti" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(items, i => i.Name == "Minced Beef" && i.Amount == 400 && i.Unit == "g");
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenSameIngredientInMultipleRecipes_MergesQuantities()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);
        var recipe1 = await CreateRecipeAsync("Pasta");
        var recipe2 = await CreateRecipeAsync("Pizza");

        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync($"/api/recipes/{recipe1.Id}/ingredients",
            new { name = "Flour", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/recipes/{recipe2.Id}/ingredients",
            new { name = "Flour", amount = 300, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Monday", recipeId = recipe1.Id, dayOfWeek = 0 }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Tuesday", recipeId = recipe2.Id, dayOfWeek = 1 }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal("Flour", items[0].Name);
        Assert.Equal(500, items[0].Amount);
        Assert.Equal("g", items[0].Unit);
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenSameNameDifferentUnit_AddsAsSeparateItems()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var plan = await CreateFoodPlanAsync("Week Plan", weekStart);
        var recipe1 = await CreateRecipeAsync("Pasta");
        var recipe2 = await CreateRecipeAsync("Pizza");

        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync($"/api/recipes/{recipe1.Id}/ingredients",
            new { name = "Flour", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/recipes/{recipe2.Id}/ingredients",
            new { name = "Flour", amount = 2, unit = "cups" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Monday", recipeId = recipe1.Id, dayOfWeek = 0 }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/entries",
            new { name = "Tuesday", recipeId = recipe2.Id, dayOfWeek = 1 }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync($"/api/food-plans/{plan.Id}/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Flour" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(items, i => i.Name == "Flour" && i.Amount == 2 && i.Unit == "cups");
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenFoodPlanNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "My List" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plans/99999/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- AutoRenew ---

    [Fact]
    public async Task CreateFoodPlan_WithAutoRenew_PersistsAutoRenewField()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/food-plans",
            new { name = "Auto Plan", weekStart, autoRenew = true }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var plan = await response.Content.ReadFromJsonAsync<FoodPlanDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(plan);
        Assert.True(plan.AutoRenew);
    }

    [Fact]
    public async Task UpdateFoodPlan_WithAutoRenew_PersistsAutoRenewField()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var client = await GetAuthenticatedHttpClientAsync();
        var plan = await CreateFoodPlanAsync("Auto Plan", weekStart);

        var updateResponse = await client.PutAsJsonAsync($"/api/food-plans/{plan.Id}",
            new { name = "Auto Plan", weekStart, autoRenew = true }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/food-plans/{plan.Id}", TestContext.Current.CancellationToken);
        var updated = await getResponse.Content.ReadFromJsonAsync<FoodPlanDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(updated);
        Assert.True(updated.AutoRenew);
    }

    // --- Helpers ---

    private async Task<FoodPlanDto> CreateFoodPlanAsync(string name, DateTime weekStart)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/food-plans", new { name, weekStart }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private async Task<RecipeDto> CreateRecipeAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private record FoodPlanDto(int Id, string? Name, DateTime WeekStart, int ActiveDays = 31, bool AutoRenew = false);
    private record FoodPlanEntryDto(int Id, int FoodPlanId, int? RecipeId, string? Name, int DayOfWeek);
    private record RecipeDto(int Id, string? Name);
    private record ShoppingListDto(int Id, string? Name);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked, decimal? Amount, string? Unit);
}
