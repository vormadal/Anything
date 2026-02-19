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

public class InventoryItemEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private AnythingApiClient? _authenticatedClient;

    public InventoryItemEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/inventoryitems ---

    [Fact]
    public async Task GetInventoryItems_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.InventoryItems.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetInventoryItems_ReturnsItems()
    {
        await CreateItemViaClient("Item A", "Description A", null, null);
        await CreateItemViaClient("Item B", "Description B", null, null);

        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.InventoryItems.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, i => i.Name == "Item A" && i.Description == "Description A");
        Assert.Contains(result, i => i.Name == "Item B" && i.Description == "Description B");
    }

    [Fact]
    public async Task GetInventoryItems_DoesNotReturnDeletedItems()
    {
        var created = await CreateItemViaClient("To Delete", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/inventoryitems/{id} ---

    [Fact]
    public async Task GetInventoryItemById_ReturnsItem()
    {
        var box = await CreateBoxViaClient(1, null);
        var unit = await CreateStorageUnitViaClient("Unit", null);
        var created = await CreateItemViaClient("Test Item", "Test Description", box.Id, unit.Id);

        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].GetAsync();

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Test Item", result.Name);
        Assert.Equal("Test Description", result.Description);
        Assert.Equal(box.Id, result.BoxId);
        Assert.Equal(unit.Id, result.StorageUnitId);
        Assert.NotNull(result.CreatedOn);
    }

    [Fact]
    public async Task GetInventoryItemById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetInventoryItemById_WhenDeleted_Returns404()
    {
        var created = await CreateItemViaClient("Deleted Item", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[created.Id].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/inventoryitems ---

    [Fact]
    public async Task CreateInventoryItem_ReturnsCreatedItem()
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
    public async Task CreateInventoryItem_WithoutDescription_Succeeds()
    {
        var created = await CreateItemViaClient("Item Without Description", null, null, null);

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("Item Without Description", created.Name);
        Assert.Null(created.Description);
    }

    [Fact]
    public async Task CreateInventoryItem_WithBoxAndStorageUnit_Succeeds()
    {
        var unit = await CreateStorageUnitViaClient("Unit", null);
        var box = await CreateBoxViaClient(1, unit.Id);
        var created = await CreateItemViaClient("Item", null, box.Id, unit.Id);

        Assert.NotNull(created);
        Assert.Equal(box.Id, created.BoxId);
        Assert.Equal(unit.Id, created.StorageUnitId);
    }

    [Fact]
    public async Task CreateInventoryItem_IsRetrievableViaGet()
    {
        var created = await CreateItemViaClient("Retrievable", null, null, null);

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.GetAsync();

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Retrievable", result[0].Name);
        Assert.Equal(created.Id, result[0].Id);
    }

    // --- PUT /api/inventoryitems/{id} ---

    [Fact]
    public async Task UpdateInventoryItem_UpdatesAllFields()
    {
        var box = await CreateBoxViaClient(1, null);
        var unit = await CreateStorageUnitViaClient("Unit", null);
        var created = await CreateItemViaClient("Original", "Original Desc", null, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryItemRequest 
            { 
                Name = "Updated", 
                Description = "Updated Desc", 
                BoxId = box.Id, 
                StorageUnitId = unit.Id 
            });

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Updated", result[0].Name);
        Assert.Equal("Updated Desc", result[0].Description);
        Assert.Equal(box.Id, result[0].BoxId);
        Assert.Equal(unit.Id, result[0].StorageUnitId);
    }

    [Fact]
    public async Task UpdateInventoryItem_SetsModifiedOn()
    {
        var created = await CreateItemViaClient("Before Update", null, null, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryItemRequest 
            { 
                Name = "After Update", 
                Description = null, 
                BoxId = null, 
                StorageUnitId = null 
            });

        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateInventoryItem_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[99999].PutAsync(
                new KiotaModels.UpdateInventoryItemRequest 
                { 
                    Name = "Nope", 
                    Description = null, 
                    BoxId = null, 
                    StorageUnitId = null 
                }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WhenDeleted_Returns404()
    {
        var created = await CreateItemViaClient("Will Delete", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[created.Id].PutAsync(
                new KiotaModels.UpdateInventoryItemRequest 
                { 
                    Name = "Too Late", 
                    Description = null, 
                    BoxId = null, 
                    StorageUnitId = null 
                }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/inventoryitems/{id} ---

    [Fact]
    public async Task DeleteInventoryItem_SoftDeletes()
    {
        var created = await CreateItemViaClient("Delete Me", null, null, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteInventoryItem_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteInventoryItem_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateItemViaClient("Double Delete", null, null, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryItems[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/inventoryitems validation ---

    [Fact]
    public async Task CreateInventoryItem_WithEmptyName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithWhitespaceName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "   ", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithNameExceeding200Chars_Returns400()
    {
        var longName = new string('a', 201);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = longName, description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithNameAt200Chars_Succeeds()
    {
        var maxName = new string('a', 200);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = maxName, description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithDescriptionExceeding1000Chars_Returns400()
    {
        var longDescription = new string('b', 1001);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "Valid Name", description = longDescription, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithDescriptionAt1000Chars_Succeeds()
    {
        var maxDescription = new string('b', 1000);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "Valid Name", description = maxDescription, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithInvalidBoxId_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "Item", description = (string?)null, boxId = 99999, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithDeletedBox_Returns400()
    {
        var box = await CreateBoxViaClient(1, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[box.Id].DeleteAsync();

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "Item", description = (string?)null, boxId = box.Id, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithInvalidStorageUnitId_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "Item", description = (string?)null, boxId = (int?)null, storageUnitId = 99999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryItem_WithDeletedStorageUnit_Returns400()
    {
        var unit = await CreateStorageUnitViaClient("Deleted Unit", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[unit.Id].DeleteAsync();

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryitems", 
            new { name = "Item", description = (string?)null, boxId = (int?)null, storageUnitId = unit.Id });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/inventoryitems/{id} validation ---

    [Fact]
    public async Task UpdateInventoryItem_WithEmptyName_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = "", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WithWhitespaceName_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = "   ", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WithNameExceeding200Chars_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);
        var longName = new string('a', 201);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = longName, description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WithDescriptionExceeding1000Chars_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);
        var longDescription = new string('b', 1001);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = "Valid Name", description = longDescription, boxId = (int?)null, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WithInvalidBoxId_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = "Valid Name", description = (string?)null, boxId = 99999, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WithDeletedBox_Returns400()
    {
        var box = await CreateBoxViaClient(1, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[box.Id].DeleteAsync();
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = "Valid Name", description = (string?)null, boxId = box.Id, storageUnitId = (int?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WithInvalidStorageUnitId_Returns400()
    {
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = "Valid Name", description = (string?)null, boxId = (int?)null, storageUnitId = 99999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItem_WithDeletedStorageUnit_Returns400()
    {
        var unit = await CreateStorageUnitViaClient("Deleted Unit", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[unit.Id].DeleteAsync();
        var created = await CreateItemViaClient("Valid Name", null, null, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryitems/{created.Id}", 
            new { name = "Valid Name", description = (string?)null, boxId = (int?)null, storageUnitId = unit.Id });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Helper ---

    private async Task<InventoryItemResponse> CreateItemViaClient(string name, string? description, int? boxId, int? storageUnitId)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.PostAsync(
            new KiotaModels.CreateInventoryItemRequest 
            { 
                Name = name, 
                Description = description, 
                BoxId = boxId, 
                StorageUnitId = storageUnitId 
            });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private async Task<InventoryBoxResponse> CreateBoxViaClient(int number, int? storageUnitId)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes.PostAsync(
            new KiotaModels.CreateInventoryBoxRequest { Number = number, StorageUnitId = storageUnitId });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryBoxResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private async Task<InventoryStorageUnitResponse> CreateStorageUnitViaClient(string name, string? type)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.PostAsync(
            new KiotaModels.CreateInventoryStorageUnitRequest { Name = name, Type = type });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryStorageUnitResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private record InventoryItemResponse(
        int Id,
        string Name,
        string? Description,
        int? BoxId,
        int? StorageUnitId,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);

    private record InventoryBoxResponse(
        int Id,
        int Number,
        int? StorageUnitId,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);

    private record InventoryStorageUnitResponse(
        int Id,
        string Name,
        string? Type,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);
}
