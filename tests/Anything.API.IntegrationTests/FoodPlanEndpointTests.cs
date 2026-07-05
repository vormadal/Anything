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

        var shoppingListResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = date, endDate = date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/checklists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
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

        var shoppingListResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
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
    public async Task AddFoodPlanToShoppingList_WhenCalledTwiceForSameDateRange_DoesNotDoubleQuantities()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe = await CreateRecipe("Pasta");

        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Spaghetti", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);

        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Pasta Dinner", recipeId = recipe.Id, date }, TestContext.Current.CancellationToken);

        var shoppingListResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = date, endDate = date }, TestContext.Current.CancellationToken);

        // Second call for the same date range — entries are already marked as added, so nothing changes
        var secondResponse = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = date, endDate = date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, secondResponse.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/checklists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal(200, items[0].Amount);
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenAddedToAnotherShoppingList_AddsIngredientsToSecondList()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var recipe = await CreateRecipe("Pasta");

        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Spaghetti", amount = 200, unit = "g" }, TestContext.Current.CancellationToken);

        var date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);
        await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = "Pasta Dinner", recipeId = recipe.Id, date }, TestContext.Current.CancellationToken);

        var shoppingListAResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping A" }, TestContext.Current.CancellationToken);
        var shoppingListA = await shoppingListAResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingListA);

        var shoppingListBResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping B" }, TestContext.Current.CancellationToken);
        var shoppingListB = await shoppingListBResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingListB);

        var firstResponse = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingListA.Id, startDate = date, endDate = date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, firstResponse.StatusCode);

        var secondResponse = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingListB.Id, startDate = date, endDate = date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, secondResponse.StatusCode);

        var listAItemsResponse = await client.GetAsync($"/api/checklists/{shoppingListA.Id}/items", TestContext.Current.CancellationToken);
        var listAItems = await listAItemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(listAItems);
        Assert.Single(listAItems);
        Assert.Equal(200, listAItems[0].Amount);

        var listBItemsResponse = await client.GetAsync($"/api/checklists/{shoppingListB.Id}/items", TestContext.Current.CancellationToken);
        var listBItems = await listBItemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(listBItems);
        Assert.Single(listBItems);
        Assert.Equal(200, listBItems[0].Amount);
    }

    [Fact]
    public async Task AddFoodPlanToShoppingList_WhenSameIngredientInMultipleRecipes_KeepsSeparatePerRecipe()
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

        var shoppingListResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = monday, endDate = tuesday }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/checklists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        // Each recipe contributes its own row so the frontend can show per-recipe amounts
        Assert.Equal(2, items.Length);
        Assert.All(items, i => Assert.Equal("Flour", i.Name));
        Assert.All(items, i => Assert.Equal("g", i.Unit));
        Assert.Contains(items, i => i.Amount == 200);
        Assert.Contains(items, i => i.Amount == 300);
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

        var shoppingListResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
        var shoppingList = await shoppingListResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shoppingList);

        var response = await client.PostAsJsonAsync("/api/food-plan/add-to-shopping-list",
            new { shoppingListId = shoppingList.Id, startDate = monday, endDate = tuesday }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/checklists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
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

        var shoppingListResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Weekly Shopping" }, TestContext.Current.CancellationToken);
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

        var itemsResponse = await client.GetAsync($"/api/checklists/{shoppingList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal("Spaghetti", items[0].Name);
        Assert.Equal(400, items[0].Amount);
    }

    // --- PUT /api/food-plan/notes?date={date} ---

    [Fact]
    public async Task UpsertFoodPlanNote_CreatesNewNote_ReturnsCreated()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateOnly(2026, 3, 16);

        var response = await client.PutAsJsonAsync(
            $"/api/food-plan/notes?date={date:yyyy-MM-dd}",
            new { note = "Eating at friends" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<FoodPlanNoteDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal("Eating at friends", result.Note);
    }

    [Fact]
    public async Task UpsertFoodPlanNote_UpdatesExistingNote_ReturnsOk()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateOnly(2026, 3, 17);

        await client.PutAsJsonAsync($"/api/food-plan/notes?date={date:yyyy-MM-dd}", new { note = "Original note" }, TestContext.Current.CancellationToken);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/food-plan/notes?date={date:yyyy-MM-dd}",
            new { note = "Updated note" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var result = await updateResponse.Content.ReadFromJsonAsync<FoodPlanNoteDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal("Updated note", result.Note);
    }

    [Fact]
    public async Task UpsertFoodPlanNote_RequiresAuthentication()
    {
        var date = new DateOnly(2026, 3, 16);
        var response = await HttpClient.PutAsJsonAsync(
            $"/api/food-plan/notes?date={date:yyyy-MM-dd}",
            new { note = "Test" },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- GET /api/food-plan/notes ---

    [Fact]
    public async Task GetFoodPlanNotes_ReturnsNotesInDateRange()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateOnly(2026, 3, 18);

        await client.PutAsJsonAsync($"/api/food-plan/notes?date={date:yyyy-MM-dd}", new { note = "Leftovers" }, TestContext.Current.CancellationToken);

        var startDate = new DateOnly(2026, 3, 18);
        var endDate = new DateOnly(2026, 3, 18);
        var response = await client.GetAsync(
            $"/api/food-plan/notes?startDate={startDate:yyyy-MM-dd}&endDate={endDate:yyyy-MM-dd}",
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var notes = await response.Content.ReadFromJsonAsync<FoodPlanNoteDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(notes);
        Assert.Single(notes);
        Assert.Equal("Leftovers", notes[0].Note);
    }

    // --- DELETE /api/food-plan/notes/{noteId} ---

    [Fact]
    public async Task DeleteFoodPlanNote_WhenExists_ReturnsNoContent()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var date = new DateOnly(2026, 3, 19);

        var createResponse = await client.PutAsJsonAsync($"/api/food-plan/notes?date={date:yyyy-MM-dd}", new { note = "To delete" }, TestContext.Current.CancellationToken);
        var created = await createResponse.Content.ReadFromJsonAsync<FoodPlanNoteDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var deleteResponse = await client.DeleteAsync($"/api/food-plan/notes/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteFoodPlanNote_WhenNotFound_Returns404()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.DeleteAsync("/api/food-plan/notes/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/food-plan/suggestions ---

    [Fact]
    public async Task GetSuggestions_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/food-plan/suggestions?date=2026-09-15", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetSuggestions_ExcludesRecentAndRanksRestedAboveNeverPlanned()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var targetDate = new DateOnly(2026, 9, 15);
        var plannedYesterday = await CreateRecipe($"Yesterday {Guid.NewGuid()}");
        var plannedLongAgo = await CreateRecipe($"LongAgo {Guid.NewGuid()}");
        var neverPlanned = await CreateRecipe($"Never {Guid.NewGuid()}");

        await AddEntry(plannedYesterday, new DateTime(2026, 9, 14, 0, 0, 0, DateTimeKind.Utc));
        await AddEntry(plannedLongAgo, new DateTime(2026, 6, 10, 0, 0, 0, DateTimeKind.Utc));

        var response = await client.GetAsync($"/api/food-plan/suggestions?date={targetDate:yyyy-MM-dd}&count=50", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var suggestions = await response.Content.ReadFromJsonAsync<List<FoodPlanSuggestionDto>>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(suggestions);

        Assert.DoesNotContain(suggestions, s => s.RecipeId == plannedYesterday.Id);
        var longAgoIndex = suggestions.FindIndex(s => s.RecipeId == plannedLongAgo.Id);
        var neverIndex = suggestions.FindIndex(s => s.RecipeId == neverPlanned.Id);
        Assert.True(longAgoIndex >= 0, "Recipe planned long ago should be suggested");
        Assert.True(neverIndex >= 0, "Never-planned recipe should be suggested");
        Assert.True(longAgoIndex < neverIndex, "A fully rested recipe should outrank a never-planned one");
        Assert.Contains(suggestions[longAgoIndex].Reasons, r => r.StartsWith("Last planned"));
        Assert.Contains("Not planned yet", suggestions[neverIndex].Reasons);
    }

    // --- /api/food-plan/seasonal-tags ---

    [Fact]
    public async Task GetSeasonalTags_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/food-plan/seasonal-tags", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetSeasonalTags_SeedsDefaultRulesOnFirstUse()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.GetAsync("/api/food-plan/seasonal-tags", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var rules = await response.Content.ReadFromJsonAsync<List<SeasonalTagRuleDto>>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(rules);
        Assert.Contains(rules, r => r.Keyword == "jul" && r.Boost == 15);
        Assert.Contains(rules, r => r.Keyword == "sommer" && r.Boost == 10);
    }

    [Fact]
    public async Task SeasonalTagRule_CrudRoundtrip()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var keyword = $"testtag{Guid.NewGuid():N}"[..20];

        var createResponse = await client.PostAsJsonAsync("/api/food-plan/seasonal-tags",
            new { keyword, matchPrefix = true, months = 0b1000000000, boost = 12 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<SeasonalTagRuleDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);
        Assert.Equal(keyword, created.Keyword);

        var updateResponse = await client.PutAsJsonAsync($"/api/food-plan/seasonal-tags/{created.Id}",
            new { keyword, matchPrefix = false, months = 0b0100000000, boost = 8 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<SeasonalTagRuleDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(updated);
        Assert.Equal(8, updated.Boost);
        Assert.False(updated.MatchPrefix);

        var deleteResponse = await client.DeleteAsync($"/api/food-plan/seasonal-tags/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var listResponse = await client.GetAsync("/api/food-plan/seasonal-tags", TestContext.Current.CancellationToken);
        var rules = await listResponse.Content.ReadFromJsonAsync<List<SeasonalTagRuleDto>>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(rules);
        Assert.DoesNotContain(rules, r => r.Id == created.Id);
    }

    [Fact]
    public async Task CreateSeasonalTagRule_WithInvalidMonths_Returns400()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PostAsJsonAsync("/api/food-plan/seasonal-tags",
            new { keyword = "invalid", matchPrefix = false, months = 0, boost = 10 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Suggestion tuning settings ---

    [Fact]
    public async Task UpdateFoodPlanSettings_PersistsSuggestionTuning()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PutAsJsonAsync("/api/food-plan/settings",
            new
            {
                activeDays = 31,
                suggestionRotationWeight = 50,
                suggestionExclusionWindowDays = 13
            }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var getResponse = await client.GetAsync("/api/food-plan/settings", TestContext.Current.CancellationToken);
        var settings = await getResponse.Content.ReadFromJsonAsync<FoodPlanSettingsDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(settings);
        Assert.Equal(50, settings.SuggestionRotationWeight);
        Assert.Equal(13, settings.SuggestionExclusionWindowDays);
        // Untouched tuning values keep their defaults.
        Assert.Equal(25, settings.SuggestionFavoritesWeight);
    }

    // --- Helpers ---

    private async Task AddEntry(RecipeDto recipe, DateTime date)
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PostAsJsonAsync("/api/food-plan/entries",
            new { name = recipe.Name, recipeId = recipe.Id, date }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private async Task<RecipeDto> CreateRecipe(string name)
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private record FoodPlanSettingsDto(
        int Id,
        int ActiveDays,
        int SuggestionRotationWeight = 40,
        int SuggestionFavoritesWeight = 25,
        int SuggestionSeasonalityWeight = 20,
        int SuggestionExclusionWindowDays = 6,
        int SuggestionRotationSaturationDays = 84,
        int SuggestionSeasonalityWindowDays = 21);
    private record FoodPlanSuggestionDto(int RecipeId, string Name, double Score, List<string> Reasons, DateOnly? LastPlannedOn, int TimesPlanned);
    private record SeasonalTagRuleDto(int Id, string Keyword, bool MatchPrefix, int Months, int Boost);
    private record FoodPlanEntryDto(int Id, int? RecipeId, string? Name, DateTime Date, DateTime? AddedToShoppingListOn);
    private record FoodPlanNoteDto(int Id, DateOnly Date, string Note);
    private record RecipeDto(int Id, string? Name);
    private record ShoppingListDto(int Id, string? Name);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked, decimal? Amount, string? Unit);
}
