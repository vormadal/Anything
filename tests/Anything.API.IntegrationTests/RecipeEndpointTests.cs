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

    // --- CRUD Lifecycle ---

    [Fact]
    public async Task CrudLifecycle_CreateReadUpdateDeleteWorkCorrectly()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        // Empty initially
        var emptyResponse = await client.GetAsync("/api/recipes");
        Assert.Equal(HttpStatusCode.OK, emptyResponse.StatusCode);
        var emptyResult = await emptyResponse.Content.ReadFromJsonAsync<RecipeDto[]>(JsonOptions);
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Create with all fields
        var recipe = await CreateRecipeAsync("Stew", "https://example.com", "My notes");
        Assert.True(recipe.Id > 0);
        Assert.Equal("Stew", recipe.Name);
        Assert.Equal("https://example.com", recipe.Link);
        Assert.Equal("My notes", recipe.Notes);

        // Create list returns items
        await CreateRecipeAsync("Pizza", null, null);
        var listResponse = await client.GetAsync("/api/recipes");
        var list = await listResponse.Content.ReadFromJsonAsync<RecipeDto[]>(JsonOptions);
        Assert.NotNull(list);
        Assert.Equal(2, list.Length);

        // Get by ID
        var getResponse = await client.GetAsync($"/api/recipes/{recipe.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var getResult = await getResponse.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(getResult);
        Assert.Equal("Stew", getResult.Name);

        // Update
        var updateResponse = await client.PutAsJsonAsync($"/api/recipes/{recipe.Id}",
            new { name = "New Name", link = "https://updated.com", notes = "Updated notes" });
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var updatedGet = await client.GetAsync($"/api/recipes/{recipe.Id}");
        var updated = await updatedGet.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("New Name", updated.Name);
        Assert.Equal("https://updated.com", updated.Link);
        Assert.Equal("Updated notes", updated.Notes);

        // Delete
        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await client.GetAsync($"/api/recipes/{recipe.Id}");
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    // --- Auth ---

    [Fact]
    public async Task GetRecipes_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/recipes");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- Not Found ---

    [Fact]
    public async Task Operations_OnNonExistentRecipe_Return404()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/recipes/99999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync("/api/recipes/99999", new { name = "X" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync("/api/recipes/99999")).StatusCode);
    }

    // --- Validation ---

    [Fact]
    public async Task Create_WithInvalidData_Returns400()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var emptyName = await client.PostAsJsonAsync("/api/recipes", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, emptyName.StatusCode);

        var invalidLink = await client.PostAsJsonAsync("/api/recipes", new { name = "Test", link = "not-a-url" });
        Assert.Equal(HttpStatusCode.BadRequest, invalidLink.StatusCode);
    }

    // --- Ingredients ---

    [Fact]
    public async Task Ingredients_CrudLifecycle()
    {
        var recipe = await CreateRecipeAsync("Bread", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        // Empty initially
        var emptyResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredients");
        Assert.Equal(HttpStatusCode.OK, emptyResponse.StatusCode);
        var emptyResult = await emptyResponse.Content.ReadFromJsonAsync<IngredientDto[]>(JsonOptions);
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Add ingredients
        var flour = await AddIngredientAsync(recipe.Id, "Flour", 500, "g", null);
        Assert.True(flour.Id > 0);
        Assert.Equal("Flour", flour.Name);
        Assert.Equal(500, flour.Amount);
        Assert.Equal("g", flour.Unit);

        var lettuce = await AddIngredientAsync(recipe.Id, "Lettuce", 1, "head", "Salad Base");
        Assert.Equal("Salad Base", lettuce.Group);

        // Delete
        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}/ingredients/{flour.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredients");
        var remaining = await afterDelete.Content.ReadFromJsonAsync<IngredientDto[]>(JsonOptions);
        Assert.NotNull(remaining);
        Assert.Single(remaining);
    }

    [Fact]
    public async Task Ingredients_ValidationAndNotFound()
    {
        var recipe = await CreateRecipeAsync("Test", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        // Zero amount is now allowed (for ingredients like "salt to taste")
        var zeroAmount = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Salt", amount = 0 });
        Assert.Equal(HttpStatusCode.Created, zeroAmount.StatusCode);

        // Negative amount
        var negativeAmount = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Flour", amount = -1 });
        Assert.Equal(HttpStatusCode.BadRequest, negativeAmount.StatusCode);

        // Recipe not found
        var notFound = await client.PostAsJsonAsync("/api/recipes/99999/ingredients",
            new { name = "Salt", amount = 1 });
        Assert.Equal(HttpStatusCode.NotFound, notFound.StatusCode);

        var getNotFound = await client.GetAsync("/api/recipes/99999/ingredients");
        Assert.Equal(HttpStatusCode.NotFound, getNotFound.StatusCode);
    }

    [Fact]
    public async Task ImportRecipe_CreatesRecipeWithIngredientsAndStepsAtomically()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync("/api/recipes/import", new
        {
            name = "Pasta Carbonara",
            link = "https://example.com/carbonara",
            notes = "Classic Italian",
            ingredients = new[]
            {
                new { name = "Spaghetti", amount = 200, unit = "g", group = (string?)null },
                new { name = "Salt", amount = (decimal?)null, unit = (string?)null, group = (string?)null },
                new { name = "Bacon", amount = 150, unit = "g", group = (string?)null },
            },
            steps = new[]
            {
                new { text = "Boil pasta", order = 1 },
                new { text = "Fry bacon", order = 2 },
                new { text = "Combine and serve", order = 3 },
            }
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var recipe = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(recipe);
        Assert.True(recipe.Id > 0);
        Assert.Equal("Pasta Carbonara", recipe.Name);

        var ingredientsResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredients");
        var ingredients = await ingredientsResponse.Content.ReadFromJsonAsync<IngredientDto[]>(JsonOptions);
        Assert.NotNull(ingredients);
        Assert.Equal(3, ingredients.Length);
        Assert.Contains(ingredients, i => i.Name == "Spaghetti" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(ingredients, i => i.Name == "Salt" && i.Amount == null);
        Assert.Contains(ingredients, i => i.Name == "Bacon" && i.Amount == 150 && i.Unit == "g");

        var stepsResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/steps");
        var steps = await stepsResponse.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions);
        Assert.NotNull(steps);
        Assert.Equal(3, steps.Length);
    }

    [Fact]
    public async Task ImportRecipe_WithNegativeAmount_ClampsToZero()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync("/api/recipes/import", new
        {
            name = "Test Recipe",
            link = (string?)null,
            notes = (string?)null,
            ingredients = new[]
            {
                new { name = "Some ingredient", amount = -5, unit = (string?)null, group = (string?)null },
            },
            steps = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var recipe = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(recipe);

        var ingredientsResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/ingredients");
        var ingredients = await ingredientsResponse.Content.ReadFromJsonAsync<IngredientDto[]>(JsonOptions);
        Assert.NotNull(ingredients);
        Assert.Single(ingredients);
        Assert.Equal(0, ingredients[0].Amount);
    }

    [Fact]
    public async Task ImportRecipe_WithEmptyName_Returns400()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync("/api/recipes/import", new
        {
            name = "",
            ingredients = Array.Empty<object>(),
            steps = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ImportRecipe_WithNoIngredientsOrSteps_CreatesRecipe()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync("/api/recipes/import", new
        {
            name = "Simple Recipe",
            link = (string?)null,
            notes = (string?)null,
            ingredients = Array.Empty<object>(),
            steps = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var recipe = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);
        Assert.NotNull(recipe);
        Assert.Equal("Simple Recipe", recipe.Name);
    }

    // --- Steps ---

    [Fact]
    public async Task Steps_CrudLifecycle()
    {
        var recipe = await CreateRecipeAsync("Omelette", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        // Empty initially
        var emptyResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/steps");
        var emptyResult = await emptyResponse.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions);
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Add steps (out of order) and verify ordering
        await AddStepAsync(recipe.Id, "Serve", 3);
        await AddStepAsync(recipe.Id, "Boil water", 1);
        await AddStepAsync(recipe.Id, "Add ingredients", 2);

        var stepsResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/steps");
        var steps = await stepsResponse.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions);
        Assert.NotNull(steps);
        Assert.Equal(3, steps.Length);
        Assert.Equal("Boil water", steps[0].Text);
        Assert.Equal("Add ingredients", steps[1].Text);
        Assert.Equal("Serve", steps[2].Text);

        // Delete
        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}/steps/{steps[0].Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await client.GetAsync($"/api/recipes/{recipe.Id}/steps");
        var remaining = await afterDelete.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions);
        Assert.NotNull(remaining);
        Assert.Equal(2, remaining.Length);
    }

    [Fact]
    public async Task Steps_WithEmptyText_Returns400()
    {
        var recipe = await CreateRecipeAsync("Test", null, null);
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/steps",
            new { text = "", order = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Images ---

    [Fact]
    public async Task Images_CrudLifecycle()
    {
        var recipe = await CreateRecipeAsync("Steak", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        // Empty initially
        var emptyResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/images");
        var emptyResult = await emptyResponse.Content.ReadFromJsonAsync<ImageDto[]>(JsonOptions);
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Add image
        var image = await AddImageAsync(recipe.Id, "https://example.com/steak.jpg");
        Assert.True(image.Id > 0);
        Assert.Equal("https://example.com/steak.jpg", image.Url);

        // Delete
        var deleteResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}/images/{image.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await client.GetAsync($"/api/recipes/{recipe.Id}/images");
        var remaining = await afterDelete.Content.ReadFromJsonAsync<ImageDto[]>(JsonOptions);
        Assert.NotNull(remaining);
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task Images_ValidationAndNotFound()
    {
        var recipe = await CreateRecipeAsync("Test", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var invalidUrl = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/images",
            new { url = "not-a-url" });
        Assert.Equal(HttpStatusCode.BadRequest, invalidUrl.StatusCode);

        var notFound = await client.PostAsJsonAsync("/api/recipes/99999/images",
            new { url = "https://example.com/img.jpg" });
        Assert.Equal(HttpStatusCode.NotFound, notFound.StatusCode);
    }

    // --- Add to Shopping List ---

    [Fact]
    public async Task AddToShoppingList_AddsIngredientsAndMergesOnSecondAdd()
    {
        var recipe = await CreateRecipeAsync("Pasta", null, null);
        await AddIngredientAsync(recipe.Id, "Spaghetti", 200, "g", null);
        await AddIngredientAsync(recipe.Id, "Tomato sauce", 1, null, null);

        var listId = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        // First add
        var response = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = listId });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{listId}/items");
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions);
        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Spaghetti" && i.Amount == 200 && i.Unit == "g");
        Assert.Contains(items, i => i.Name == "Tomato sauce" && i.Amount == 1 && i.Unit == null);

        // Second add merges quantities
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = listId });

        var mergedResponse = await client.GetAsync($"/api/shopping-lists/{listId}/items");
        var merged = await mergedResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions);
        Assert.NotNull(merged);
        Assert.Equal(2, merged.Length);
        Assert.Contains(merged, i => i.Name == "Spaghetti" && i.Amount == 400 && i.Unit == "g");
    }

    [Fact]
    public async Task AddToShoppingList_SameNameDifferentUnit_AddsSeparateItems()
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
    public async Task AddToShoppingList_NotFoundScenarios()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        // Recipe not found
        var listId = await CreateShoppingListAsync("My List");
        var recipeNotFound = await client.PostAsJsonAsync("/api/recipes/99999/add-to-shopping-list",
            new { shoppingListId = listId });
        Assert.Equal(HttpStatusCode.NotFound, recipeNotFound.StatusCode);

        // Shopping list not found
        var recipe = await CreateRecipeAsync("Tacos", null, null);
        var listNotFound = await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/add-to-shopping-list",
            new { shoppingListId = 99999 });
        Assert.Equal(HttpStatusCode.NotFound, listNotFound.StatusCode);
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
    private record IngredientDto(int Id, int RecipeId, string? Name, decimal? Amount, string? Unit, string? Group);
    private record StepDto(int Id, int RecipeId, string? Text, int Order);
    private record ImageDto(int Id, int RecipeId, string? Url);
    private record ShoppingListDto(int Id, string? Name);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked, decimal? Amount, string? Unit);
}
