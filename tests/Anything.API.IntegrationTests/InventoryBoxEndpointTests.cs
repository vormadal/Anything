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

public class InventoryBoxEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private AnythingApiClient? _authenticatedClient;

    public InventoryBoxEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/inventoryboxes ---

    [Fact]
    public async Task GetInventoryBoxes_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.InventoryBoxes.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetInventoryBoxes_ReturnsBoxes()
    {
        await CreateBoxViaClient(1, null);
        await CreateBoxViaClient(2, null);

        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.InventoryBoxes.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, b => b.Number == 1);
        Assert.Contains(result, b => b.Number == 2);
    }

    [Fact]
    public async Task GetInventoryBoxes_DoesNotReturnDeletedItems()
    {
        var created = await CreateBoxViaClient(1, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/inventoryboxes/{id} ---

    [Fact]
    public async Task GetInventoryBoxById_ReturnsBox()
    {
        var unit = await CreateStorageUnitViaClient("Test Unit", null);
        var created = await CreateBoxViaClient(42, unit.Id);

        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].GetAsync();

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryBoxResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal(42, result.Number);
        Assert.Equal(unit.Id, result.StorageUnitId);
        Assert.NotNull(result.CreatedOn);
    }

    [Fact]
    public async Task GetInventoryBoxById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetInventoryBoxById_WhenDeleted_Returns404()
    {
        var created = await CreateBoxViaClient(1, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[created.Id].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/inventoryboxes ---

    [Fact]
    public async Task CreateInventoryBox_ReturnsCreatedItem()
    {
        var created = await CreateBoxViaClient(100, null);

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal(100, created.Number);
        Assert.Null(created.StorageUnitId);
        Assert.NotNull(created.CreatedOn);
    }

    [Fact]
    public async Task CreateInventoryBox_WithStorageUnit_Succeeds()
    {
        var unit = await CreateStorageUnitViaClient("Test Unit", null);
        var created = await CreateBoxViaClient(200, unit.Id);

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal(200, created.Number);
        Assert.Equal(unit.Id, created.StorageUnitId);
    }

    [Fact]
    public async Task CreateInventoryBox_IsRetrievableViaGet()
    {
        var created = await CreateBoxViaClient(300, null);

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes.GetAsync();

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(300, result[0].Number);
        Assert.Equal(created.Id, result[0].Id);
    }

    // --- PUT /api/inventoryboxes/{id} ---

    [Fact]
    public async Task UpdateInventoryBox_UpdatesNumberAndStorageUnitId()
    {
        var unit = await CreateStorageUnitViaClient("Unit", null);
        var created = await CreateBoxViaClient(1, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryBoxRequest { Number = 999, StorageUnitId = unit.Id });

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(999, result[0].Number);
        Assert.Equal(unit.Id, result[0].StorageUnitId);
    }

    [Fact]
    public async Task UpdateInventoryBox_SetsModifiedOn()
    {
        var created = await CreateBoxViaClient(1, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryBoxRequest { Number = 2, StorageUnitId = null });

        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryBoxResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateInventoryBox_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[99999].PutAsync(
                new KiotaModels.UpdateInventoryBoxRequest { Number = 1, StorageUnitId = null }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateInventoryBox_WhenDeleted_Returns404()
    {
        var created = await CreateBoxViaClient(1, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[created.Id].PutAsync(
                new KiotaModels.UpdateInventoryBoxRequest { Number = 2, StorageUnitId = null }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/inventoryboxes/{id} ---

    [Fact]
    public async Task DeleteInventoryBox_SoftDeletes()
    {
        var created = await CreateBoxViaClient(1, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteInventoryBox_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteInventoryBox_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateBoxViaClient(1, null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteInventoryBox_SetsBoxIdToNullForActiveItems()
    {
        var box = await CreateBoxViaClient(1, null);
        var item = await CreateItemViaClient("Item In Box", box.Id, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[box.Id].DeleteAsync();

        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryItems[item.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Null(result.BoxId);
    }

    [Fact]
    public async Task DeleteInventoryBox_WithMultipleActiveItems_SetsAllBoxIdsToNull()
    {
        var box = await CreateBoxViaClient(1, null);
        var item1 = await CreateItemViaClient("Item 1", box.Id, null);
        var item2 = await CreateItemViaClient("Item 2", box.Id, null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[box.Id].DeleteAsync();

        var items = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.GetAsync();
        Assert.NotNull(items);
        Assert.Equal(2, items.Count);
        Assert.All(items, item => Assert.Null(item.BoxId));
    }

    // --- POST /api/inventoryboxes validation ---

    [Fact]
    public async Task CreateInventoryBox_WithInvalidStorageUnitId_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryboxes", new { number = 1, storageUnitId = 99999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryBox_WithDeletedStorageUnit_Returns400()
    {
        var unit = await CreateStorageUnitViaClient("Deleted Unit", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[unit.Id].DeleteAsync();

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventoryboxes", new { number = 1, storageUnitId = unit.Id });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/inventoryboxes/{id} validation ---

    [Fact]
    public async Task UpdateInventoryBox_WithInvalidStorageUnitId_Returns400()
    {
        var created = await CreateBoxViaClient(1, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryboxes/{created.Id}", new { number = 1, storageUnitId = 99999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryBox_WithDeletedStorageUnit_Returns400()
    {
        var unit = await CreateStorageUnitViaClient("Deleted Unit", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[unit.Id].DeleteAsync();
        var created = await CreateBoxViaClient(1, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventoryboxes/{created.Id}", new { number = 1, storageUnitId = unit.Id });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Helper ---

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

    private async Task<InventoryItemResponse> CreateItemViaClient(string name, int? boxId, int? storageUnitId)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.PostAsync(
            new KiotaModels.CreateInventoryItemRequest { Name = name, Description = null, BoxId = boxId, StorageUnitId = storageUnitId });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

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

    private record InventoryItemResponse(
        int Id,
        string Name,
        string? Description,
        int? BoxId,
        int? StorageUnitId,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);
}
