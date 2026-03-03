using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class RecipeEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public RecipeEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/recipes ---

    [Fact]
    public async Task GetRecipes_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/recipes");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetRecipes_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/recipes");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetRecipes_ReturnsCreatedRecipes()
    {
        await CreateRecipeAsync("Pasta", null, null);
        await CreateRecipeAsync("Pizza", null, null);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/recipes");
        var result = await response.Content.ReadFromJsonAsync<RecipeDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Equal(2, result.Length);
        Assert.Contains(result, r => r.Name == "Pasta");
        Assert.Contains(result, r => r.Name == "Pizza");
    }

    [Fact]
    public async Task GetRecipes_DoesNotReturnDeletedRecipes()
    {
        var recipe = await CreateRecipeAsync("Deleted", null, null);
        var client = await GetAuthenticatedHttpClientAsync();
        await client.DeleteAsync($"/api/recipes/{recipe.Id}");

        var response = await client.GetAsync("/api/recipes");
        var result = await response.Content.ReadFromJsonAsync<RecipeDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/recipes/{id} ---

    [Fact]
    public async Task GetRecipeById_ReturnsRecipe()
    {
        var recipe = await CreateRecipeAsync("Soup", "https://example.com", "Tasty soup");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/recipes/{recipe.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(recipe.Id, result.Id);
        Assert.Equal("Soup", result.Name);
        Assert.Equal("https://example.com", result.Link);
        Assert.Equal("Tasty soup", result.Notes);
    }

    [Fact]
    public async Task GetRecipeById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/recipes/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetRecipeById_WhenDeleted_Returns404()
    {
        var recipe = await CreateRecipeAsync("Gone", null, null);
        var client = await GetAuthenticatedHttpClientAsync();
        await client.DeleteAsync($"/api/recipes/{recipe.Id}");

        var response = await client.GetAsync($"/api/recipes/{recipe.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/recipes ---

    [Fact]
    public async Task CreateRecipe_ReturnsCreatedRecipe()
    {
        var recipe = await CreateRecipeAsync("Stew", "https://example.com", "My notes");

        Assert.True(recipe.Id > 0);
        Assert.Equal("Stew", recipe.Name);
        Assert.Equal("https://example.com", recipe.Link);
        Assert.Equal("My notes", recipe.Notes);
    }

    [Fact]
    public async Task CreateRecipe_WithEmptyName_Returns400()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateRecipe_WithInvalidLink_Returns400()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name = "Test", link = "not-a-url" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/recipes/{id} ---

    [Fact]
    public async Task UpdateRecipe_UpdatesFields()
    {
        var recipe = await CreateRecipeAsync("Old Name", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var updateResponse = await client.PutAsJsonAsync($"/api/recipes/{recipe.Id}",
            new { name = "New Name", link = "https://updated.com", notes = "Updated notes" });
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/recipes/{recipe.Id}");
        var updated = await getResponse.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("New Name", updated.Name);
        Assert.Equal("https://updated.com", updated.Link);
        Assert.Equal("Updated notes", updated.Notes);
    }

    [Fact]
    public async Task UpdateRecipe_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync("/api/recipes/99999", new { name = "X" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/recipes/{id} ---

    [Fact]
    public async Task DeleteRecipe_SoftDeletes()
    {
        var recipe = await CreateRecipeAsync("Delete Me", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/recipes/{recipe.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteRecipe_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/recipes/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/recipes/{id}/ingredients ---

    [Fact]
    public async Task GetIngredients_ReturnsEmptyList()
    {
        var recipe = await CreateRecipeAsync("Cake", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredients");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<IngredientDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetIngredients_WhenRecipeNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/recipes/99999/ingredients");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/recipes/{id}/ingredients ---

    [Fact]
    public async Task AddIngredient_ReturnsCreatedIngredient()
    {
        var recipe = await CreateRecipeAsync("Bread", null, null);
        var ingredient = await AddIngredientAsync(recipe.Id, "Flour", 500, "g", null);

        Assert.True(ingredient.Id > 0);
        Assert.Equal("Flour", ingredient.Name);
        Assert.Equal(500, ingredient.Amount);
        Assert.Equal("g", ingredient.Unit);
    }

    [Fact]
    public async Task AddIngredient_WithGroup_ReturnsGroupedIngredient()
    {
        var recipe = await CreateRecipeAsync("Salad", null, null);
        var ingredient = await AddIngredientAsync(recipe.Id, "Lettuce", 1, "head", "Salad Base");

        Assert.Equal("Salad Base", ingredient.Group);
    }

    [Fact]
    public async Task AddIngredient_WithZeroAmount_Returns400()
    {
        var recipe = await CreateRecipeAsync("Test", null, null);
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Flour", amount = 0 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddIngredient_WithNegativeAmount_Returns400()
    {
        var recipe = await CreateRecipeAsync("Test", null, null);
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Flour", amount = -1 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddIngredient_WhenRecipeNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes/99999/ingredients",
            new { name = "Salt", amount = 1 });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/recipes/{id}/ingredients/{ingredientId} ---

    [Fact]
    public async Task DeleteIngredient_SoftDeletes()
    {
        var recipe = await CreateRecipeAsync("Cookies", null, null);
        var ingredient = await AddIngredientAsync(recipe.Id, "Sugar", 200, "g", null);
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}/ingredients/{ingredient.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredients");
        var result = await getResponse.Content.ReadFromJsonAsync<IngredientDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/recipes/{id}/steps ---

    [Fact]
    public async Task GetSteps_ReturnsEmptyList()
    {
        var recipe = await CreateRecipeAsync("Omelette", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.GetAsync($"/api/recipes/{recipe.Id}/steps");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- POST /api/recipes/{id}/steps ---

    [Fact]
    public async Task AddStep_ReturnsCreatedStep()
    {
        var recipe = await CreateRecipeAsync("Omelette", null, null);
        var step = await AddStepAsync(recipe.Id, "Crack eggs", 1);

        Assert.True(step.Id > 0);
        Assert.Equal("Crack eggs", step.Text);
        Assert.Equal(1, step.Order);
    }

    [Fact]
    public async Task GetSteps_ReturnsStepsOrderedByOrder()
    {
        var recipe = await CreateRecipeAsync("Soup", null, null);
        await AddStepAsync(recipe.Id, "Serve", 3);
        await AddStepAsync(recipe.Id, "Boil water", 1);
        await AddStepAsync(recipe.Id, "Add ingredients", 2);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/recipes/{recipe.Id}/steps");
        var result = await response.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Equal(3, result.Length);
        Assert.Equal("Boil water", result[0].Text);
        Assert.Equal("Add ingredients", result[1].Text);
        Assert.Equal("Serve", result[2].Text);
    }

    [Fact]
    public async Task AddStep_WithEmptyText_Returns400()
    {
        var recipe = await CreateRecipeAsync("Test", null, null);
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/steps",
            new { text = "", order = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- DELETE /api/recipes/{id}/steps/{stepId} ---

    [Fact]
    public async Task DeleteStep_SoftDeletes()
    {
        var recipe = await CreateRecipeAsync("Pancakes", null, null);
        var step = await AddStepAsync(recipe.Id, "Mix ingredients", 1);
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}/steps/{step.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/steps");
        var result = await getResponse.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/recipes/{id}/images ---

    [Fact]
    public async Task GetImages_ReturnsEmptyList()
    {
        var recipe = await CreateRecipeAsync("Steak", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.GetAsync($"/api/recipes/{recipe.Id}/images");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ImageDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- POST /api/recipes/{id}/images ---

    [Fact]
    public async Task AddImage_ReturnsCreatedImage()
    {
        var recipe = await CreateRecipeAsync("Steak", null, null);
        var image = await AddImageAsync(recipe.Id, "https://example.com/steak.jpg");

        Assert.True(image.Id > 0);
        Assert.Equal("https://example.com/steak.jpg", image.Url);
    }

    [Fact]
    public async Task AddImage_WithInvalidUrl_Returns400()
    {
        var recipe = await CreateRecipeAsync("Test", null, null);
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/images",
            new { url = "not-a-url" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddImage_WhenRecipeNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes/99999/images",
            new { url = "https://example.com/img.jpg" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/recipes/{id}/images/{imageId} ---

    [Fact]
    public async Task DeleteImage_SoftDeletes()
    {
        var recipe = await CreateRecipeAsync("Salad", null, null);
        var image = await AddImageAsync(recipe.Id, "https://example.com/salad.jpg");
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}/images/{image.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/images");
        var result = await getResponse.Content.ReadFromJsonAsync<ImageDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- POST /api/recipes/{id}/add-to-shopping-list ---

    [Fact]
    public async Task AddToShoppingList_AddsIngredientsAsItems()
    {
        var recipe = await CreateRecipeAsync("Pasta", null, null);
        await AddIngredientAsync(recipe.Id, "Spaghetti", 200, "g", null);
        await AddIngredientAsync(recipe.Id, "Tomato sauce", 1, null, null);

        var listId = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = listId });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{listId}/items");
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Spaghetti" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(items, i => i.Name == "Tomato sauce" && i.Amount == 1 && i.Unit == null);
    }

    [Fact]
    public async Task AddToShoppingList_WhenAddedTwice_MergesQuantitiesForSameUnit()
    {
        var recipe = await CreateRecipeAsync("Pasta", null, null);
        await AddIngredientAsync(recipe.Id, "Spaghetti", 200, "g", null);

        var listId = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = listId });
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = listId });

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{listId}/items");
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions);
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal("Spaghetti", items[0].Name);
        Assert.Equal(400, items[0].Amount);
        Assert.Equal("g", items[0].Unit);
    }

    [Fact]
    public async Task AddToShoppingList_WhenSameNameDifferentUnit_AddsAsSeparateItems()
    {
        var recipe1 = await CreateRecipeAsync("Recipe A", null, null);
        await AddIngredientAsync(recipe1.Id, "Flour", 200, "g", null);

        var recipe2 = await CreateRecipeAsync("Recipe B", null, null);
        await AddIngredientAsync(recipe2.Id, "Flour", 2, "cups", null);

        var listId = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        await client.PostAsJsonAsync($"/api/recipes/{recipe1.Id}/add-to-shopping-list",
            new { shoppingListId = listId });
        await client.PostAsJsonAsync($"/api/recipes/{recipe2.Id}/add-to-shopping-list",
            new { shoppingListId = listId });

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{listId}/items");
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Flour" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(items, i => i.Name == "Flour" && i.Amount == 2 && i.Unit == "cups");
    }

    [Fact]
    public async Task AddToShoppingList_WhenRecipeNotFound_Returns404()
    {
        var listId = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync("/api/recipes/99999/add-to-shopping-list",
            new { shoppingListId = listId });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddToShoppingList_WhenShoppingListNotFound_Returns404()
    {
        var recipe = await CreateRecipeAsync("Tacos", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = 99999 });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Helpers ---

    private async Task<RecipeDto> CreateRecipeAsync(string name, string? link, string? notes)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name, link, notes });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private async Task<IngredientDto> AddIngredientAsync(int recipeId, string name, decimal amount, string? unit, string? group)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipeId}/ingredients",
            new { name, amount, unit, group });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<IngredientDto>(JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private async Task<StepDto> AddStepAsync(int recipeId, string text, int order)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipeId}/steps",
            new { text, order });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<StepDto>(JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private async Task<ImageDto> AddImageAsync(int recipeId, string url)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipeId}/images",
            new { url });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ImageDto>(JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private async Task<int> CreateShoppingListAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/shopping-lists", new { name });
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions);
        return result!.Id;
    }

    private record RecipeDto(int Id, string? Name, string? Link, string? Notes);
    private record IngredientDto(int Id, int RecipeId, string? Name, decimal Amount, string? Unit, string? Group);
    private record StepDto(int Id, int RecipeId, string? Text, int Order);
    private record ImageDto(int Id, int RecipeId, string? Url);
    private record ShoppingListDto(int Id, string? Name);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked, decimal? Amount, string? Unit);
}
