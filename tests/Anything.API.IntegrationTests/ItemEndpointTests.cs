using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.ApiClient;
using Anything.API.IntegrationTests.Infrastructure;
using Microsoft.Kiota.Abstractions;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using Xunit;
using KiotaModels = Anything.API.IntegrationTests.ApiClient.Models;

namespace Anything.API.IntegrationTests;

public class ItemEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private AnythingApiClient? _authenticatedClient;

    public ItemEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    private async Task<AnythingApiClient> GetAuthenticatedClientAsync()
    {
        if (_authenticatedClient == null)
        {
            var token = await GetAdminTokenAsync();
            var httpClient = GetAuthenticatedHttpClient(token);
            var adapter = new HttpClientRequestAdapter(
                new AnonymousAuthenticationProvider(),
                httpClient: httpClient);
            adapter.BaseUrl = httpClient.BaseAddress?.ToString().TrimEnd('/') ?? "";
            _authenticatedClient = new AnythingApiClient(adapter);
        }
        return _authenticatedClient;
    }

    // --- GET /api/items ---

    [Fact]
    public async Task GetItems_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Items.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetItems_ReturnsItems()
    {
        await CreateItemViaClient("Item A", "Description A", null, null);
        await CreateItemViaClient("Item B", "Description B", null, null);

        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Items.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, i => i.Name == "Item A");
        Assert.Contains(result, i => i.Name == "Item B");
    }

    [Fact]
    public async Task GetItems_DoesNotReturnDeletedItems()
    {
        var created = await CreateItemViaClient("To Delete", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Items.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/items/{id} ---

    [Fact]
    public async Task GetItemById_ReturnsItem()
    {
        var created = await CreateItemViaClient("Test Item", "Test Description", null, null);

        var stream = await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].GetAsync();

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<ItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Test Item", result.Name);
        Assert.Equal("Test Description", result.Description);
        Assert.NotNull(result.CreatedOn);
    }

    [Fact]
    public async Task GetItemById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Items[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetItemById_WhenDeleted_Returns404()
    {
        var created = await CreateItemViaClient("Deleted Item", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Items[created.Id].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/items ---

    [Fact]
    public async Task CreateItem_ReturnsCreatedItem()
    {
        var created = await CreateItemViaClient("New Item", "New Description", null, null);

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("New Item", created.Name);
        Assert.Equal("New Description", created.Description);
        Assert.Null(created.BoxId);
        Assert.Null(created.StorageUnitId);
        Assert.NotNull(created.CreatedOn);
    }

    [Fact]
    public async Task CreateItem_IsRetrievableViaGet()
    {
        var created = await CreateItemViaClient("Retrievable", "Can be retrieved", null, null);

        var result = await (await GetAuthenticatedClientAsync()).Api.Items.GetAsync();

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Retrievable", result[0].Name);
        Assert.Equal(created.Id, result[0].Id);
    }

    // --- PUT /api/items/{id} ---

    [Fact]
    public async Task UpdateItem_UpdatesNameAndDescription()
    {
        var created = await CreateItemViaClient("Original", "Original Description", null, null);

        await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].PutAsync(
            new KiotaModels.UpdateItemRequest { Name = "Updated", Description = "Updated Description" });

        var result = await (await GetAuthenticatedClientAsync()).Api.Items.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Updated", result[0].Name);
        Assert.Equal("Updated Description", result[0].Description);
    }

    [Fact]
    public async Task UpdateItem_SetsModifiedOn()
    {
        var created = await CreateItemViaClient("Before Update", null, null, null);

        await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].PutAsync(
            new KiotaModels.UpdateItemRequest { Name = "After Update" });

        var stream = await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<ItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateItem_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Items[99999].PutAsync(
                new KiotaModels.UpdateItemRequest { Name = "Nope" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateItem_WhenDeleted_Returns404()
    {
        var created = await CreateItemViaClient("Will Delete", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Items[created.Id].PutAsync(
                new KiotaModels.UpdateItemRequest { Name = "Too Late" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/items/{id} ---

    [Fact]
    public async Task DeleteItem_SoftDeletes()
    {
        var created = await CreateItemViaClient("Delete Me", null, null, null);

        await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Items.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteItem_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Items[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteItem_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateItemViaClient("Double Delete", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.Items[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Items[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/items validation ---

    [Fact]
    public async Task CreateItem_WithEmptyName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/items", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WithWhitespaceName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/items", new { name = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WithNameExceeding200Chars_Returns400()
    {
        var longName = new string('a', 201);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/items", new { name = longName });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WithNameAt200Chars_Succeeds()
    {
        var maxName = new string('a', 200);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/items", new { name = maxName });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WithDescriptionExceeding1000Chars_Returns400()
    {
        var longDescription = new string('b', 1001);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/items", new { name = "Valid", description = longDescription });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WithDescriptionAt1000Chars_Succeeds()
    {
        var maxDescription = new string('b', 1000);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/items", new { name = "Valid", description = maxDescription });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // --- PUT /api/items/{id} validation ---

    [Fact]
    public async Task UpdateItem_WithEmptyName_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/items/{created.Id}", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateItem_WithWhitespaceName_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/items/{created.Id}", new { name = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateItem_WithNameExceeding200Chars_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);
        var longName = new string('a', 201);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/items/{created.Id}", new { name = longName });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateItem_WithDescriptionExceeding1000Chars_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);
        var longDescription = new string('b', 1001);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/items/{created.Id}", new { name = "Valid", description = longDescription });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Helper ---

    private async Task<ItemResponse> CreateItemViaClient(string name, string? description, int? boxId, int? storageUnitId)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.Items.PostAsync(
            new KiotaModels.CreateItemRequest { Name = name, Description = description, BoxId = boxId, StorageUnitId = storageUnitId });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<ItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private record ItemResponse(
        int Id,
        string Name,
        string? Description,
        int? BoxId,
        int? StorageUnitId,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);
}
