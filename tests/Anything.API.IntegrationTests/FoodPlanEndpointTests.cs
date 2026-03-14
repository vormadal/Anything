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

    private async Task<HttpClient> GetOrCreateAuthenticatedHttpClient()
    {
        if (_authenticatedHttpClient == null)
        {
            var token = await GetAdminTokenAsync();
            _authenticatedHttpClient = GetAuthenticatedHttpClient(token);
        }
        return _authenticatedHttpClient;
    }

    // --- GET /api/food-plan/settings ---

    [Fact]
    public async Task GetFoodPlanSettings_ReturnsDefaultSettings()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.GetAsync("/api/food-plan/settings", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanSettingsDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(31, result.ActiveDays);
    }

    [Fact]
    public async Task GetFoodPlanSettings_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/food-plan/settings", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- PUT /api/food-plan/settings ---

    [Fact]
    public async Task UpdateFoodPlanSettings_ReturnsUpdatedSettings()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PutAsJsonAsync("/api/food-plan/settings",
            new { activeDays = 127 }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanSettingsDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(127, result.ActiveDays);
    }

    [Fact]
    public async Task UpdateFoodPlanSettings_PersistsChanges()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        await client.PutAsJsonAsync("/api/food-plan/settings",
            new { activeDays = 65 }, TestContext.Current.CancellationToken);

        var getResponse = await client.GetAsync("/api/food-plan/settings", TestContext.Current.CancellationToken);
        var result = await getResponse.Content.ReadFromJsonAsync<FoodPlanSettingsDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(65, result.ActiveDays);
    }

    [Fact]
    public async Task UpdateFoodPlanSettings_WithInvalidActiveDays_Returns400()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PutAsJsonAsync("/api/food-plan/settings",
            new { activeDays = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- POST /api/food-plan/entries ---

    [Fact]
    public async Task AddFoodPlanEntry_WithRecipe_ReturnsCreated()
    {
        var recipe = await CreateRecipe("Pasta");
        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);

        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Pasta Dinner", recipeId = recipe.Id, date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var entry = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);
        Assert.Equal(recipe.Id, entry.RecipeId);
        Assert.Equal(date, entry.Date);
        Assert.Equal("Pasta Dinner", entry.Name);
    }

    [Fact]
    public async Task AddFoodPlanEntry_WithoutRecipeId_AutoCreatesRecipe()
    {
        var date = new DateTime(2026, 3, 17, 0, 0, 0, DateTimeKind.Utc);

        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Homemade Salad", date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var entry = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);
        Assert.Equal("Homemade Salad", entry.Name);
        Assert.Equal(date, entry.Date);
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
        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);

        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PostAsJsonAsync("/api/food-plan/entries",
            new { date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddFoodPlanEntry_RequiresAuthentication()
    {
        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        var response = await HttpClient.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Test", date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/food-plan/entries?startDate=...&endDate=... ---

    [Fact]
    public async Task GetFoodPlanEntries_ReturnsEntriesInDateRange()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe = await CreateRecipe("Pizza");

        var monday = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        var tuesday = new DateTime(2026, 3, 17, 0, 0, 0, DateTimeKind.Utc);
        var nextMonday = new DateTime(2026, 3, 23, 0, 0, 0, DateTimeKind.Utc);

        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Pizza Dinner", recipeId = recipe.Id, date = monday }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Salad", date = tuesday }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Next Week Meal", date = nextMonday }, TestContext.Current.CancellationToken);

        var startDate = monday.ToString("O");
        var endDate = new DateTime(2026, 3, 22, 0, 0, 0, DateTimeKind.Utc).ToString("O");
        var response = await client.GetAsync($"/api/food-plan/entries?startDate={startDate}&endDate={endDate}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var entries = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entries);
        Assert.Equal(2, entries.Length);
        Assert.Contains(entries, e => e.Name == "Pizza Dinner");
        Assert.Contains(entries, e => e.Name == "Salad");
    }

    [Fact]
    public async Task GetFoodPlanEntries_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var startDate = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc).ToString("O");
        var endDate = new DateTime(2026, 3, 22, 0, 0, 0, DateTimeKind.Utc).ToString("O");

        var response = await client.GetAsync($"/api/food-plan/entries?startDate={startDate}&endDate={endDate}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var entries = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entries);
        Assert.Empty(entries);
    }

    [Fact]
    public async Task GetFoodPlanEntries_DoesNotReturnDeletedEntries()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);

        var createResponse = await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "To Delete", date }, TestContext.Current.CancellationToken);
        var entry = await createResponse.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);

        await client.DeleteAsync($"/api/food-plan/entries/{entry.Id}", TestContext.Current.CancellationToken);

        var startDate = date.ToString("O");
        var endDate = date.ToString("O");
        var response = await client.GetAsync($"/api/food-plan/entries?startDate={startDate}&endDate={endDate}", TestContext.Current.CancellationToken);
        var entries = await response.Content.ReadFromJsonAsync<FoodPlanEntryDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entries);
        Assert.Empty(entries);
    }

    // --- PUT /api/food-plan/entries/{entryId} ---

    [Fact]
    public async Task UpdateFoodPlanEntry_ReturnsNoContent()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        var newDate = new DateTime(2026, 3, 18, 0, 0, 0, DateTimeKind.Utc);

        var createResponse = await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Old Name", date }, TestContext.Current.CancellationToken);
        var entry = await createResponse.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);

        var response = await client.PutAsJsonAsync($"/api/food-plan/entries/{entry.Id}",
            new { name = "New Name", date = newDate }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateFoodPlanEntry_WhenNotFound_Returns404()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);

        var response = await client.PutAsJsonAsync("/api/food-plan/entries/99999",
            new { name = "Name", date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/food-plan/entries/{entryId} ---

    [Fact]
    public async Task DeleteFoodPlanEntry_ReturnsNoContent()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);

        var createResponse = await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Salad", date }, TestContext.Current.CancellationToken);
        var entry = await createResponse.Content.ReadFromJsonAsync<FoodPlanEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entry);

        var deleteResponse = await client.DeleteAsync($"/api/food-plan/entries/{entry.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteFoodPlanEntry_WhenNotFound_Returns404()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.DeleteAsync("/api/food-plan/entries/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/food-plan/add-to-shopping-list ---

    [Fact]
    public async Task AddFoodPlanToShoppingList_AddsIngredients()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe = await CreateRecipe("Spaghetti Bolognese");

        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Spaghetti", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Minced Beef", amount = 400, unit = "g" }, TestContext.Current.CancellationToken);

        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Spaghetti Dinner", recipeId = recipe.Id, date }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = date, endDate = date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Spaghetti" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(items, i => i.Name == "Minced Beef" && i.Amount == 400 && i.Unit == "g");
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_MarksEntriesAsAdded()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe = await CreateRecipe("Pasta");

        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Pasta", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);

        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Pasta Dinner", recipeId = recipe.Id, date }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = date, endDate = date }, TestContext.Current.CancellationToken);

        var startDateStr = date.ToString("O");
        var endDateStr = date.ToString("O");
        var entriesResponse = await client.GetAsync($"/api/food-plan/entries?startDate={startDateStr}&endDate={endDateStr}", TestContext.Current.CancellationToken);
        var entries = await entriesResponse.Content.ReadFromJsonAsync<FoodPlanEntryDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entries);
        Assert.Single(entries);
        Assert.NotNull(entries[0].AddedToShoppingListOn);
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenSameIngredientInMultipleRecipes_MergesQuantities()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe1 = await CreateRecipe("Pasta");
        var recipe2 = await CreateRecipe("Pizza");

        await client.PostAsJsonAsync($"/api/recipes/{recipe1.Id}/ingredients",
            new { name = "Flour", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/recipes/{recipe2.Id}/ingredients",
            new { name = "Flour", amount = 300, unit = "g" }, TestContext.Current.CancellationToken);

        var monday = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        var tuesday = new DateTime(2026, 3, 17, 0, 0, 0, DateTimeKind.Utc);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Monday", recipeId = recipe1.Id, date = monday }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Tuesday", recipeId = recipe2.Id, date = tuesday }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = monday, endDate = tuesday }, TestContext.Current.CancellationToken);
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
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe1 = await CreateRecipe("Pasta");
        var recipe2 = await CreateRecipe("Pizza");

        await client.PostAsJsonAsync($"/api/recipes/{recipe1.Id}/ingredients",
            new { name = "Flour", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/recipes/{recipe2.Id}/ingredients",
            new { name = "Flour", amount = 2, unit = "cups" }, TestContext.Current.CancellationToken);

        var monday = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        var tuesday = new DateTime(2026, 3, 17, 0, 0, 0, DateTimeKind.Utc);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Monday", recipeId = recipe1.Id, date = monday }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Tuesday", recipeId = recipe2.Id, date = tuesday }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = monday, endDate = tuesday }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Flour" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(items, i => i.Name == "Flour" && i.Amount == 2 && i.Unit == "cups");
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenShoppingListNotFound_Returns404()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var startDate = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        var endDate = new DateTime(2026, 3, 22, 0, 0, 0, DateTimeKind.Utc);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = 99999, startDate, endDate }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WithRecipeMultipliers_ScalesIngredients()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe = await CreateRecipe("Pasta");

        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Spaghetti", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);

        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Pasta Dinner", recipeId = recipe.Id, date }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new
            {
                shoppingListId = shoppingList.Id,
                startDate = date,
                endDate = date,
                recipeMultipliers = new[] { new { recipeId = recipe.Id, multiplier = 2.0 } }
            }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal("Spaghetti", items[0].Name);
        Assert.Equal(400, items[0].Amount);
    }

    // --- Helpers ---

    private async Task<RecipeDto> CreateRecipe(string name)
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private record FoodPlanSettingsDto(int Id, int ActiveDays);
    private record FoodPlanEntryDto(int Id, int? RecipeId, string? Name, DateTime Date, DateTime? AddedToShoppingListOn);
    private record RecipeDto(int Id, string? Name);
    private record ShoppingListDto(int Id, string? Name);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked, decimal? Amount, string? Unit);
}
