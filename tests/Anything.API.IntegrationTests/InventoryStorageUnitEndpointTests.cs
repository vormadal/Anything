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

public class InventoryStorageUnitEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private AnythingApiClient? _authenticatedClient;

    public InventoryStorageUnitEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/inventory-storage-units ---

    [Fact]
    public async Task GetInventoryStorageUnits_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.InventoryStorageUnits.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetInventoryStorageUnits_ReturnsStorageUnits()
    {
        await CreateStorageUnitViaClient("Garage", "Building");
        await CreateStorageUnitViaClient("Attic", "Room");

        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.InventoryStorageUnits.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, s => s.Name == "Garage" && s.Type == "Building");
        Assert.Contains(result, s => s.Name == "Attic" && s.Type == "Room");
    }

    [Fact]
    public async Task GetInventoryStorageUnits_DoesNotReturnDeletedItems()
    {
        var created = await CreateStorageUnitViaClient("To Delete", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/inventory-storage-units/{id} ---

    [Fact]
    public async Task GetInventoryStorageUnitById_ReturnsStorageUnit()
    {
        var created = await CreateStorageUnitViaClient("Test Unit", "Warehouse");

        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].GetAsync();

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryStorageUnitResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Test Unit", result.Name);
        Assert.Equal("Warehouse", result.Type);
        Assert.NotNull(result.CreatedOn);
    }

    [Fact]
    public async Task GetInventoryStorageUnitById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetInventoryStorageUnitById_WhenDeleted_Returns404()
    {
        var created = await CreateStorageUnitViaClient("Deleted Unit", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[created.Id].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/inventory-storage-units ---

    [Fact]
    public async Task CreateInventoryStorageUnit_ReturnsCreatedItem()
    {
        var created = await CreateStorageUnitViaClient("New Unit", "Shed");

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("New Unit", created.Name);
        Assert.Equal("Shed", created.Type);
        Assert.NotNull(created.CreatedOn);
    }

    [Fact]
    public async Task CreateInventoryStorageUnit_WithoutType_Succeeds()
    {
        var created = await CreateStorageUnitViaClient("Unit Without Type", null);

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("Unit Without Type", created.Name);
        Assert.Null(created.Type);
    }

    [Fact]
    public async Task CreateInventoryStorageUnit_IsRetrievableViaGet()
    {
        var created = await CreateStorageUnitViaClient("Retrievable", "Storage");

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.GetAsync();

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Retrievable", result[0].Name);
        Assert.Equal("Storage", result[0].Type);
        Assert.Equal(created.Id, result[0].Id);
    }

    // --- PUT /api/inventory-storage-units/{id} ---

    [Fact]
    public async Task UpdateInventoryStorageUnit_UpdatesNameAndType()
    {
        var created = await CreateStorageUnitViaClient("Original", "OldType");

        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryStorageUnitRequest { Name = "Updated", Type = "NewType" });

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Updated", result[0].Name);
        Assert.Equal("NewType", result[0].Type);
    }

    [Fact]
    public async Task UpdateInventoryStorageUnit_SetsModifiedOn()
    {
        var created = await CreateStorageUnitViaClient("Before Update", null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryStorageUnitRequest { Name = "After Update", Type = null });

        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryStorageUnitResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateInventoryStorageUnit_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[99999].PutAsync(
                new KiotaModels.UpdateInventoryStorageUnitRequest { Name = "Nope", Type = null }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateInventoryStorageUnit_WhenDeleted_Returns404()
    {
        var created = await CreateStorageUnitViaClient("Will Delete", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[created.Id].PutAsync(
                new KiotaModels.UpdateInventoryStorageUnitRequest { Name = "Too Late", Type = null }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/inventory-storage-units/{id} ---

    [Fact]
    public async Task DeleteInventoryStorageUnit_SoftDeletes()
    {
        var created = await CreateStorageUnitViaClient("Delete Me", null);

        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteInventoryStorageUnit_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteInventoryStorageUnit_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateStorageUnitViaClient("Double Delete", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteInventoryStorageUnit_WithActiveBox_Returns409()
    {
        var unit = await CreateStorageUnitViaClient("Unit With Box", null);
        await CreateBoxViaClient(1, unit.Id);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.DeleteAsync($"/api/inventory-storage-units/{unit.Id}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task DeleteInventoryStorageUnit_WithActiveItem_Returns409()
    {
        var unit = await CreateStorageUnitViaClient("Unit With Item", null);
        await CreateItemViaClient("Item", null, unit.Id);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.DeleteAsync($"/api/inventory-storage-units/{unit.Id}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task DeleteInventoryStorageUnit_WithDeletedBox_Succeeds()
    {
        var unit = await CreateStorageUnitViaClient("Unit With Deleted Box", null);
        var box = await CreateBoxViaClient(1, unit.Id);
        await (await GetAuthenticatedClientAsync()).Api.InventoryBoxes[box.Id].DeleteAsync();

        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[unit.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- POST /api/inventory-storage-units validation ---

    [Fact]
    public async Task CreateInventoryStorageUnit_WithEmptyName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = "", type = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryStorageUnit_WithWhitespaceName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = "   ", type = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryStorageUnit_WithNameExceeding200Chars_Returns400()
    {
        var longName = new string('a', 201);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = longName, type = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryStorageUnit_WithNameAt200Chars_Succeeds()
    {
        var maxName = new string('a', 200);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = maxName, type = (string?)null });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryStorageUnit_WithTypeExceeding100Chars_Returns400()
    {
        var longType = new string('b', 101);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = "Valid Name", type = longType });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateInventoryStorageUnit_WithTypeAt100Chars_Succeeds()
    {
        var maxType = new string('b', 100);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = "Valid Name", type = maxType });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // --- PUT /api/inventory-storage-units/{id} validation ---

    [Fact]
    public async Task UpdateInventoryStorageUnit_WithEmptyName_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventory-storage-units/{created.Id}", new { name = "", type = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryStorageUnit_WithWhitespaceName_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventory-storage-units/{created.Id}", new { name = "   ", type = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryStorageUnit_WithNameExceeding200Chars_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);
        var longName = new string('a', 201);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventory-storage-units/{created.Id}", new { name = longName, type = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryStorageUnit_WithTypeExceeding100Chars_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);
        var longType = new string('b', 101);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/inventory-storage-units/{created.Id}", new { name = "Valid Name", type = longType });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Helper ---

    private async Task<InventoryStorageUnitResponse> CreateStorageUnitViaClient(string name, string? type)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.PostAsync(
            new KiotaModels.CreateInventoryStorageUnitRequest { Name = name, Type = type });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryStorageUnitResponse>(stream, JsonOptions);
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

    private async Task<InventoryItemResponse> CreateItemViaClient(string name, int? boxId, int? storageUnitId)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.PostAsync(
            new KiotaModels.CreateInventoryItemRequest { Name = name, Description = null, BoxId = boxId, StorageUnitId = storageUnitId });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private record InventoryStorageUnitResponse(
        int Id,
        string Name,
        string? Type,
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
