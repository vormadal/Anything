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

    // --- GET /api/checklists ---

    [Fact]
    public async Task GetShoppingLists_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/checklists", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetShoppingLists_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/checklists", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetShoppingLists_ReturnsCreatedLists()
    {
        await CreateShoppingListAsync("Groceries");
        await CreateShoppingListAsync("Hardware");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/checklists", TestContext.Current.CancellationToken);
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
        await client.DeleteAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);

        var response = await client.GetAsync("/api/checklists", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/checklists/{id} ---

    [Fact]
    public async Task GetShoppingListById_ReturnsShoppingList()
    {
        var list = await CreateShoppingListAsync("My List");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);

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
        var response = await client.GetAsync("/api/checklists/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/checklists ---

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
        var response = await HttpClient.PostAsJsonAsync("/api/checklists", new { name = "Test" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateShoppingList_WithEmptyName_Returns400()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/checklists", new { name = "" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShoppingList_WithGeneralType_ReturnsType0()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/checklists", new { name = "My Checklist", type = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(0, result.Type);
    }

    [Fact]
    public async Task CreateShoppingList_WithNoType_DefaultsToShopping()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/checklists", new { name = "Default Type List" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(1, result.Type);
    }

    [Fact]
    public async Task GetShoppingLists_IncludesTypeField()
    {
        await CreateGeneralChecklistAsync("General List");
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/checklists", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Contains(result, l => l.Name == "General List" && l.Type == 0);
    }

    [Fact]
    public async Task GetShoppingListById_IncludesTypeField()
    {
        var list = await CreateGeneralChecklistAsync("My General Checklist");
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(0, result.Type);
    }

    [Fact]
    public async Task AddShoppingListItem_ToGeneralChecklist_NullsAmountAndUnit()
    {
        var list = await CreateGeneralChecklistAsync("My Checklist");
        var item = await AddItemAsync(list.Id, "Task", 5m, "units");
        Assert.Equal("Task", item.Name);
        Assert.Null(item.Amount);
        Assert.Null(item.Unit);
    }

    // --- DELETE /api/checklists/{id} ---

    [Fact]
    public async Task DeleteShoppingList_SoftDeletes()
    {
        var list = await CreateShoppingListAsync("To Delete");
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Soft-deleted lists are no longer accessible by ID (returns 404)
        var getResponse = await client.GetAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteShoppingList_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/checklists/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- GET /api/checklists/{id}/items ---

    [Fact]
    public async Task GetShoppingListItems_WhenEmpty_ReturnsEmptyList()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetShoppingListItems_WhenListNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/checklists/99999/items", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/checklists/{id}/items ---

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

        var response = await client.PostAsJsonAsync($"/api/checklists/{list.Id}/items",
            new { name = "Milk", amount = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_WithNegativeAmount_Returns400()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync($"/api/checklists/{list.Id}/items",
            new { name = "Milk", amount = -1 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_WithEmptyName_Returns400()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync($"/api/checklists/{list.Id}/items",
            new { name = "" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddShoppingListItem_WhenListNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/checklists/99999/items",
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
        var response = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await response.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(items);
        Assert.Equal(2, items.Length);
        Assert.Contains(items, i => i.Name == "Bread" && i.Amount == 2m && i.Unit == "loaves");
        Assert.Contains(items, i => i.Name == "Butter" && i.Amount == null);
    }

    [Fact]
    public async Task AddShoppingListItem_ToGeneralChecklist_AppendsItemAtEnd()
    {
        var list = await CreateGeneralChecklistAsync("My Checklist");
        await AddItemAsync(list.Id, "First", null, null);
        await AddItemAsync(list.Id, "Second", null, null);
        await AddItemAsync(list.Id, "Third", null, null);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await response.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(items);
        Assert.Equal(["First", "Second", "Third"], items.Select(i => i.Name).ToArray());
    }

    [Fact]
    public async Task ReorderShoppingListItems_ReordersGeneralChecklistItems()
    {
        var list = await CreateGeneralChecklistAsync("My Checklist");
        var first = await AddItemAsync(list.Id, "First", null, null);
        var second = await AddItemAsync(list.Id, "Second", null, null);
        var third = await AddItemAsync(list.Id, "Third", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var reorderResponse = await client.PutAsJsonAsync(
            $"/api/checklists/{list.Id}/items/reorder",
            new { ids = new[] { third.Id, first.Id, second.Id } },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, reorderResponse.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(items);
        Assert.Equal(["Third", "First", "Second"], items.Select(i => i.Name).ToArray());
    }

    // --- PUT /api/checklists/{id}/items/{itemId} ---

    [Fact]
    public async Task UpdateShoppingListItem_CheckingItemKeepsItVisibleWithIsCheckedTrue()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Milk", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/checklists/{list.Id}/items/{item.Id}",
            new { name = "Whole Milk", isChecked = true }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        // Checked items remain visible in the list (IsChecked=true, CompletedOn=null)
        // Only items with CompletedOn set are hidden
        var itemsResponse = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal("Whole Milk", items[0].Name);
        Assert.True(items[0].IsChecked);
    }

    [Fact]
    public async Task UpdateShoppingListItem_UpdatesAmountAndUnit()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Sugar", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/checklists/{list.Id}/items/{item.Id}",
            new { name = "Sugar", isChecked = false, amount = 300, unit = "g" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
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
            $"/api/checklists/{list.Id}/items/99999",
            new { name = "X", isChecked = false }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/checklists/{id}/items/{itemId} ---

    [Fact]
    public async Task DeleteShoppingListItem_RemovesItem()
    {
        var list = await CreateShoppingListAsync("My List");
        var item = await AddItemAsync(list.Id, "Milk", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var deleteResponse = await client.DeleteAsync($"/api/checklists/{list.Id}/items/{item.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var itemsResponse = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Empty(items);
    }

    [Fact]
    public async Task DeleteShoppingListItem_WhenNotFound_Returns404()
    {
        var list = await CreateShoppingListAsync("My List");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.DeleteAsync($"/api/checklists/{list.Id}/items/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- POST /api/checklists/{id}/complete ---

    [Fact]
    public async Task CompleteShoppingList_MarksUncheckedItemsComplete_WhenMarkUncheckedTrue()
    {
        var list = await CreateShoppingListAsync("Weekly Shop");
        await AddItemAsync(list.Id, "Milk", null, null);
        await AddItemAsync(list.Id, "Bread", null, null);

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync(
            $"/api/checklists/{list.Id}/complete",
            new { markUnchecked = true },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Items should now be completed (hidden from items endpoint)
        var itemsResponse = await client.GetAsync($"/api/checklists/{list.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Empty(items);
    }

    [Fact]
    public async Task CompleteShoppingList_ListRemainsActiveAfterCompletion()
    {
        var list = await CreateShoppingListAsync("Weekly Shop");
        var client = await GetAuthenticatedHttpClientAsync();
        await client.PostAsJsonAsync(
            $"/api/checklists/{list.Id}/complete",
            new { markUnchecked = false },
            TestContext.Current.CancellationToken);

        // List is still accessible and not soft-deleted
        var getResponse = await client.GetAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var result = await getResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Null(result?.DeletedOn);
    }

    [Fact]
    public async Task CompleteShoppingList_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync(
            "/api/checklists/99999/complete",
            new { markUnchecked = false },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Helpers ---

    // --- PUT /api/checklists/{id}/type ---

    [Fact]
    public async Task ConvertShoppingListType_ShoppingToGeneral_ReturnsNoContent()
    {
        var list = await CreateShoppingListAsync("Shopping to Convert");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PutAsJsonAsync($"/api/checklists/{list.Id}/type", new { type = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var getResponse = await client.GetAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);
        var result = await getResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal(0, result?.Type);
    }

    [Fact]
    public async Task ConvertShoppingListType_GeneralToShopping_ReturnsNoContent()
    {
        var list = await CreateGeneralChecklistAsync("Checklist to Convert");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PutAsJsonAsync($"/api/checklists/{list.Id}/type", new { type = 1 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var getResponse = await client.GetAsync($"/api/checklists/{list.Id}", TestContext.Current.CancellationToken);
        var result = await getResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal(1, result?.Type);
    }

    [Fact]
    public async Task ConvertShoppingListType_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync("/api/checklists/99999/type", new { type = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ConvertShoppingListType_WithInvalidType_Returns400()
    {
        var list = await CreateShoppingListAsync("Any List");
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync($"/api/checklists/{list.Id}/type", new { type = 99 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Templates: POST /api/checklists (isTemplate: true) ---

    [Fact]
    public async Task CreateShoppingList_WithIsTemplateTrue_CreatesTemplateDirectly()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            "/api/checklists", new { name = "Camping Trip", type = 0, isTemplate = true }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var template = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(template);
        Assert.True(template.IsTemplate);
        Assert.Equal("Camping Trip", template.Name);

        // It appears among templates, not active lists
        var templatesResponse = await client.GetAsync("/api/checklists/templates", TestContext.Current.CancellationToken);
        var templates = await templatesResponse.Content.ReadFromJsonAsync<ShoppingListTemplateDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(templates);
        Assert.Contains(templates, t => t.Id == template.Id);

        var listsResponse = await client.GetAsync("/api/checklists", TestContext.Current.CancellationToken);
        var lists = await listsResponse.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(lists);
        Assert.DoesNotContain(lists, l => l.Id == template.Id);
    }

    // --- Templates: POST /api/checklists/{id}/save-as-template ---

    [Fact]
    public async Task SaveAsTemplate_CopiesItemsAndExcludesFromActiveLists()
    {
        var list = await CreateGeneralChecklistAsync("Weekly Chores");
        await AddItemAsync(list.Id, "Vacuum", null, null);
        await AddItemAsync(list.Id, "Dishes", null, null);
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/checklists/{list.Id}/save-as-template", new { }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var template = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(template);
        Assert.True(template.IsTemplate);
        Assert.Equal("Weekly Chores", template.Name);
        Assert.Equal(0, template.Type);

        // The template does not appear among active lists
        var listsResponse = await client.GetAsync("/api/checklists", TestContext.Current.CancellationToken);
        var lists = await listsResponse.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(lists);
        Assert.DoesNotContain(lists, l => l.Id == template.Id);

        // Its items were copied
        var itemsResponse = await client.GetAsync($"/api/checklists/{template.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Equal(["Vacuum", "Dishes"], items.Select(i => i.Name).ToArray());
    }

    [Fact]
    public async Task SaveAsTemplate_WithCustomName_UsesProvidedName()
    {
        var list = await CreateShoppingListAsync("Original");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/checklists/{list.Id}/save-as-template", new { name = "My Template" }, TestContext.Current.CancellationToken);
        var template = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal("My Template", template?.Name);
    }

    [Fact]
    public async Task SaveAsTemplate_WhenListNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync(
            "/api/checklists/99999/save-as-template", new { }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Templates: GET /api/checklists/templates ---

    [Fact]
    public async Task GetTemplates_ReturnsTemplatesWithItemCount()
    {
        var list = await CreateShoppingListAsync("Groceries");
        await AddItemAsync(list.Id, "Milk", null, null);
        await AddItemAsync(list.Id, "Bread", null, null);
        var template = await SaveAsTemplateAsync(list.Id, "Grocery Template");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/checklists/templates", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var templates = await response.Content.ReadFromJsonAsync<ShoppingListTemplateDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(templates);
        var dto = Assert.Single(templates, t => t.Id == template.Id);
        Assert.Equal("Grocery Template", dto.Name);
        Assert.Equal(2, dto.ItemCount);
    }

    // --- Templates: POST /api/checklists/from-template ---

    [Fact]
    public async Task CreateFromTemplate_CopiesItemsUncheckedAndTracksSource()
    {
        var source = await CreateShoppingListAsync("Source");
        await AddItemAsync(source.Id, "Apples", 3m, "kg");
        await AddItemAsync(source.Id, "Oranges", null, null);
        var template = await SaveAsTemplateAsync(source.Id, "Fruit Template");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync(
            "/api/checklists/from-template", new { templateId = template.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var newList = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(newList);
        Assert.Equal("Fruit Template", newList.Name);
        Assert.Equal(template.Id, newList.SourceTemplateId);
        Assert.False(newList.IsTemplate);

        // Appears among active lists
        var listsResponse = await client.GetAsync("/api/checklists", TestContext.Current.CancellationToken);
        var lists = await listsResponse.Content.ReadFromJsonAsync<ShoppingListDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(lists);
        Assert.Contains(lists, l => l.Id == newList.Id);

        // Items copied and unchecked
        var itemsResponse = await client.GetAsync($"/api/checklists/{newList.Id}/items", TestContext.Current.CancellationToken);
        var items = await itemsResponse.Content.ReadFromJsonAsync<ShoppingListItemDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(items);
        Assert.Equal(["Apples", "Oranges"], items.Select(i => i.Name).ToArray());
        Assert.All(items, i => Assert.False(i.IsChecked));
        Assert.Contains(items, i => i.Name == "Apples" && i.Amount == 3m && i.Unit == "kg");
    }

    [Fact]
    public async Task CreateFromTemplate_WithCustomName_UsesProvidedName()
    {
        var source = await CreateShoppingListAsync("Source");
        var template = await SaveAsTemplateAsync(source.Id, "Template");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            "/api/checklists/from-template", new { templateId = template.Id, name = "This Week" }, TestContext.Current.CancellationToken);
        var newList = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal("This Week", newList?.Name);
    }

    [Fact]
    public async Task CreateFromTemplate_WhenTemplateNotFound_Returns404()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync(
            "/api/checklists/from-template", new { templateId = 99999 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateFromTemplate_WithNonTemplateId_Returns404()
    {
        // A regular list id is not a valid template
        var list = await CreateShoppingListAsync("Regular List");
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync(
            "/api/checklists/from-template", new { templateId = list.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Helpers ---

    private async Task<ShoppingListDto> CreateShoppingListAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/checklists", new { name }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private async Task<ShoppingListDto> CreateGeneralChecklistAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/checklists", new { name, type = 0 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private async Task<ShoppingListDto> SaveAsTemplateAsync(int listId, string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/checklists/{listId}/save-as-template", new { name }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private async Task<ShoppingListItemDto> AddItemAsync(int listId, string name, decimal? amount, string? unit)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync($"/api/checklists/{listId}/items",
            new { name, amount, unit }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ShoppingListItemDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private record ShoppingListDto(int Id, string? Name, int Type = 1, DateTime? DeletedOn = null, bool IsTemplate = false, int? SourceTemplateId = null);
    private record ShoppingListItemDto(int Id, string? Name, bool IsChecked, decimal? Amount, string? Unit);
    private record ShoppingListTemplateDto(int Id, string? Name, int Type, int ItemCount);
}
