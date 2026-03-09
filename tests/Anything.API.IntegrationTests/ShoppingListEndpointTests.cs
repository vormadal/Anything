using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class ShoppingListEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public ShoppingListEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/shopping-lists ---

    [Fact]
    public async Task GetShoppingLists_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-lists", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetShoppingLists_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/shopping-lists", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetShoppingLists_ReturnsCreatedLists()
    {
        await CreateShoppingListAsync("Groceries");
        await CreateShoppingListAsync("Hardware");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-lists", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        Assert.Equal(2, result.Length);
        Assert.Contains(result, l => l.Name == "Groceries");
        Assert.Contains(result, l => l.Name == "Hardware");
    }

    [Fact]
    public async Task GetShoppingLists_DoesNotReturnDeletedLists()
    {
        var list = await CreateShoppingListAsync("To Delete");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.DeleteAsync($"/api/shopping-lists/{list.Id}", TestContext.Current.CancellationToken);

        var response = await client.GetAsync("/api/shopping-lists", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/shopping-lists/{id} ---

    [Fact]
    public async Task GetShoppingListById_ReturnsShoppingList()
    {
        var list = await CreateShoppingListAsync("My List");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/shopping-lists/{list.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(list.Id, result.Id);
        Assert.Equal("My List", result.Name);
    }

    [Fact]
    public async Task GetShoppingListById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-lists/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/shopping-lists ---

    [Fact]
    public async Task CreateShoppingList_ReturnsCreatedList()
    {
        var list = await CreateShoppingListAsync("Groceries");

        Assert.True(list.Id > 0);
        Assert.Equal("Groceries", list.Name);
    }

    [Fact]
    public async Task CreateShoppingList_RequiresAuthentication()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/shopping-lists", new { name = "Test" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateShoppingList_WithEmptyName_Returns400()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/shopping-lists", new { name = "" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- DELETE /api/shopping-lists/{id} ---

    [Fact]
    public async Task DeleteShoppingList_SoftDeletes()
    {
        var list = await CreateShoppingListAsync("To Delete");
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/shopping-lists/{list.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Soft-deleted lists are still accessible by ID (with DeletedOn set)
        var getResponse = await client.GetAsync($"/api/shopping-lists/{list.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var result = await getResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result?.DeletedOn);
    }

    [Fact]
    public async Task DeleteShoppingList_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/shopping-lists/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/shopping-lists/{id}/items ---

    [Fact]
    public async Task GetShoppingListItems_WhenEmpty_ReturnsEmptyList()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.GetAsync($"/api/shopping-lists/{list.Id}/items", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetShoppingListItems_WhenListNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-lists/99999/items", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/shopping-lists/{id}/items ---

    [Fact]
    public async Task AddShoppingListItem_WithNameOnly_ReturnsCreatedItem()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Milk", null, null);

        Assert.True(item.Id > 0);
        Assert.Equal("Milk", item.Name);
        Assert.False(item.IsChecked);
        Assert.Null(item.Amount);
        Assert.Null(item.Unit);
    }

    [Fact]
    public async Task AddShoppingListItem_WithAmountAndUnit_StoresQuantity()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Flour", 500m, "g");

        Assert.Equal("Flour", item.Name);
        Assert.Equal(500m, item.Amount);
        Assert.Equal("g", item.Unit);
    }

    [Fact]
    public async Task AddShoppingListItem_WithAmountAndNoUnit_StoresAmountOnly()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Eggs", 12m, null);

        Assert.Equal("Eggs", item.Name);
        Assert.Equal(12m, item.Amount);
        Assert.Null(item.Unit);
    }

    [Fact]
    public async Task AddShoppingListItem_WithZeroAmount_Returns400()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync($"/api/shopping-lists/{list.Id}/items",
            new { name = "Milk", amount = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_WithNegativeAmount_Returns400()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync($"/api/shopping-lists/{list.Id}/items",
            new { name = "Milk", amount = -1 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_WithEmptyName_Returns400()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync($"/api/shopping-lists/{list.Id}/items",
            new { name = "" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_WhenListNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/shopping-lists/99999/items",
            new { name = "Milk" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_AppearsInItemsList()
    {
        var list = await CreateShoppingListAsync("My List");
        await AddItemAsync(list.Id, "Bread", 2m, "loaves");
        await AddItemAsync(list.Id, "Butter", null, null);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/shopping-lists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await response.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Bread" && i.Amount == 2m && i.Unit == "loaves");
        Assert.Contains(items, i => i.Name == "Butter" && i.Amount == null);
    }

    // --- PUT /api/shopping-lists/{id}/items/{itemId} ---

    [Fact]
    public async Task UpdateShoppingListItem_UpdatesNameAndChecked()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Milk", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/shopping-lists/{list.Id}/items/{item.Id}",
            new { name = "Whole Milk", isChecked = true }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        var updated = Assert.Single(items);
        Assert.Equal("Whole Milk", updated.Name);
        Assert.True(updated.IsChecked);
    }

    [Fact]
    public async Task UpdateShoppingListItem_UpdatesAmountAndUnit()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Sugar", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/shopping-lists/{list.Id}/items/{item.Id}",
            new { name = "Sugar", isChecked = false, amount = 300, unit = "g" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        var updated = Assert.Single(items);
        Assert.Equal(300m, updated.Amount);
        Assert.Equal("g", updated.Unit);
    }

    [Fact]
    public async Task UpdateShoppingListItem_WhenNotFound_Returns404()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PutAsJsonAsync(
            $"/api/shopping-lists/{list.Id}/items/99999",
            new { name = "X", isChecked = false }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/shopping-lists/{id}/items/{itemId} ---

    [Fact]
    public async Task DeleteShoppingListItem_RemovesItem()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Milk", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/shopping-lists/{list.Id}/items/{item.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/shopping-lists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Empty(items);
    }

    [Fact]
    public async Task DeleteShoppingListItem_WhenNotFound_Returns404()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.DeleteAsync($"/api/shopping-lists/{list.Id}/items/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/shopping-lists/completed ---

    [Fact]
    public async Task GetCompletedShoppingLists_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-lists/completed", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCompletedShoppingLists_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/shopping-lists/completed", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetCompletedShoppingLists_ReturnsCompletedLists()
    {
        var list = await CreateShoppingListAsync("Weekly Shop");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsync($"/api/shopping-lists/{list.Id}/complete", null, TestContext.Current.CancellationToken);

        var response = await client.GetAsync("/api/shopping-lists/completed", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Weekly Shop", result[0].Name);
        Assert.NotNull(result[0].DeletedOn);
    }

    [Fact]
    public async Task GetCompletedShoppingLists_DoesNotReturnActiveLists()
    {
        await CreateShoppingListAsync("Active List");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/shopping-lists/completed", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- POST /api/shopping-lists/{id}/complete ---

    [Fact]
    public async Task CompleteShoppingList_ChecksAllUncheckedItemsAndReturnsNewList()
    {
        var list = await CreateShoppingListAsync("Weekly Shop");
        await AddItemAsync(list.Id, "Milk", null, null);
        await AddItemAsync(list.Id, "Bread", null, null);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsync($"/api/shopping-lists/{list.Id}/complete", null, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var newList = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(newList);
        Assert.NotEqual(list.Id, newList.Id);
        Assert.Equal("Weekly Shop", newList.Name);
    }

    [Fact]
    public async Task CompleteShoppingList_OldListIsAccessibleAsCompleted()
    {
        var list = await CreateShoppingListAsync("Weekly Shop");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsync($"/api/shopping-lists/{list.Id}/complete", null, TestContext.Current.CancellationToken);

        // Completed lists are accessible by ID and have DeletedOn set
        var getResponse = await client.GetAsync($"/api/shopping-lists/{list.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var result = await getResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result?.DeletedOn);
    }

    [Fact]
    public async Task CompleteShoppingList_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsync("/api/shopping-lists/99999/complete", null, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Helpers ---

    private async Task<ShoppingListDto> CreateShoppingListAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/shopping-lists", new { name }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private async Task<ShoppingListItemDto> AddItemAsync(int listId, string name, decimal? amount, string? unit)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/shopping-lists/{listId}/items",
            new { name, amount, unit }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListItemDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private record ShoppingListDto(int Id, string? Name, DateTime? DeletedOn = null);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked, decimal? Amount, string? Unit);
}
