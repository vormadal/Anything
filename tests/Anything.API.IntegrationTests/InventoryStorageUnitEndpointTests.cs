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

    // --- CRUD Lifecycle ---

    [Fact]
    public async Task CrudLifecycle_CreateReadUpdateDeleteWorkCorrectly()
    {
        var client = await GetAuthenticatedClientAsync();

        // Empty initially
        var emptyResult = await client.Api.InventoryStorageUnits.GetAsync();
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Create
        var created = await CreateStorageUnitViaClient("Garage");
        Assert.True(created.Id > 0);
        Assert.Equal("Garage", created.Name);
        Assert.NotNull(created.CreatedOn);

        var second = await CreateStorageUnitViaClient("Basement");

        // List returns created items
        var listResult = await client.Api.InventoryStorageUnits.GetAsync();
        Assert.NotNull(listResult);
        Assert.Equal(2, listResult.Count);

        // Get by ID
        var stream = await client.Api.InventoryStorageUnits[created.Id].GetAsync();
        Assert.NotNull(stream);
        var getResult = await JsonSerializer.DeserializeAsync<InventoryStorageUnitResponse>(stream, JsonOptions);
        Assert.NotNull(getResult);
        Assert.Equal("Garage", getResult.Name);

        // Update
        await client.Api.InventoryStorageUnits[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryStorageUnitRequest { Name = "Updated" });
        var updatedStream = await client.Api.InventoryStorageUnits[created.Id].GetAsync();
        Assert.NotNull(updatedStream);
        var updated = await JsonSerializer.DeserializeAsync<InventoryStorageUnitResponse>(updatedStream, JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("Updated", updated.Name);
        Assert.NotNull(updated.ModifiedOn);

        // Delete
        await client.Api.InventoryStorageUnits[created.Id].DeleteAsync();
        var afterDelete = await client.Api.InventoryStorageUnits.GetAsync();
        Assert.NotNull(afterDelete);
        Assert.Single(afterDelete);
        Assert.Equal(second.Id, afterDelete[0].Id);
    }

    // --- Not Found / Deleted ---

    [Fact]
    public async Task Operations_OnNonExistentOrDeletedUnit_Return404()
    {
        var client = await GetAuthenticatedClientAsync();

        var getEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[99999].GetAsync());
        Assert.Equal(404, getEx.ResponseStatusCode);

        var updateEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[99999].PutAsync(
                new KiotaModels.UpdateInventoryStorageUnitRequest { Name = "Nope" }));
        Assert.Equal(404, updateEx.ResponseStatusCode);

        var deleteEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[99999].DeleteAsync());
        Assert.Equal(404, deleteEx.ResponseStatusCode);

        // Deleted item
        var created = await CreateStorageUnitViaClient("Will Delete");
        await client.Api.InventoryStorageUnits[created.Id].DeleteAsync();

        var getDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[created.Id].GetAsync());
        Assert.Equal(404, getDeletedEx.ResponseStatusCode);

        var updateDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[created.Id].PutAsync(
                new KiotaModels.UpdateInventoryStorageUnitRequest { Name = "Too Late" }));
        Assert.Equal(404, updateDeletedEx.ResponseStatusCode);

        var deleteDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryStorageUnits[created.Id].DeleteAsync());
        Assert.Equal(404, deleteDeletedEx.ResponseStatusCode);
    }

    // --- Delete Conflict ---

    [Fact]
    public async Task Delete_WithActiveBoxOrItem_Returns409()
    {
        var unit = await CreateStorageUnitViaClient("Unit With Box");
        await CreateBoxViaClient(1, unit.Id);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var boxConflict = await httpClient.DeleteAsync($"/api/inventory-storage-units/{unit.Id}");
        Assert.Equal(HttpStatusCode.Conflict, boxConflict.StatusCode);

        // Test with active item (different unit)
        var unit2 = await CreateStorageUnitViaClient("Unit With Item");
        await CreateItemViaClient("Item", null, unit2.Id);

        var itemConflict = await httpClient.DeleteAsync($"/api/inventory-storage-units/{unit2.Id}");
        Assert.Equal(HttpStatusCode.Conflict, itemConflict.StatusCode);
    }

    [Fact]
    public async Task Delete_WithDeletedBoxOnly_Succeeds()
    {
        var client = await GetAuthenticatedClientAsync();
        var unit = await CreateStorageUnitViaClient("Unit");
        var box = await CreateBoxViaClient(1, unit.Id);
        await client.Api.InventoryBoxes[box.Id].DeleteAsync();

        await client.Api.InventoryStorageUnits[unit.Id].DeleteAsync();

        var result = await client.Api.InventoryStorageUnits.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- Hierarchy (Parent/Child places) ---

    [Fact]
    public async Task Create_WithValidParent_NestsUnderParent()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var parent = await CreateStorageUnitViaClient("Summerhouse");

        var response = await httpClient.PostAsJsonAsync(
            "/api/inventory-storage-units", new { name = "Shed", parentId = parent.Id });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<InventoryStorageUnitResponse>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);
        Assert.Equal(parent.Id, created.ParentId);
    }

    [Fact]
    public async Task Create_WithInvalidParent_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        var response = await httpClient.PostAsJsonAsync(
            "/api/inventory-storage-units", new { name = "Shed", parentId = 99999 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_CreatingACycle_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var parent = await CreateStorageUnitViaClient("Summerhouse");
        var child = await CreateStorageUnitViaClient("Shed");

        var nest = await httpClient.PutAsJsonAsync(
            $"/api/inventory-storage-units/{child.Id}", new { name = child.Name, parentId = parent.Id });
        Assert.Equal(HttpStatusCode.NoContent, nest.StatusCode);

        // Making the parent a child of its own child would create a cycle.
        var cycle = await httpClient.PutAsJsonAsync(
            $"/api/inventory-storage-units/{parent.Id}", new { name = parent.Name, parentId = child.Id });
        Assert.Equal(HttpStatusCode.BadRequest, cycle.StatusCode);
    }

    [Fact]
    public async Task Delete_WithActiveChildPlace_Returns409()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var parent = await CreateStorageUnitViaClient("Summerhouse");
        var createChild = await httpClient.PostAsJsonAsync(
            "/api/inventory-storage-units", new { name = "Shed", parentId = parent.Id });
        Assert.Equal(HttpStatusCode.Created, createChild.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync($"/api/inventory-storage-units/{parent.Id}");
        Assert.Equal(HttpStatusCode.Conflict, deleteResponse.StatusCode);
    }

    // --- Validation ---

    [Fact]
    public async Task CreateAndUpdate_WithInvalidData_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        // Create: empty name
        var emptyName = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, emptyName.StatusCode);

        // Create: whitespace name
        var wsName = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, wsName.StatusCode);

        // Create: name > 200 chars
        var longName = new string('a', 201);
        var longNameResp = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = longName });
        Assert.Equal(HttpStatusCode.BadRequest, longNameResp.StatusCode);

        // Create: name at 200 chars succeeds
        var maxName = new string('a', 200);
        var maxNameResp = await httpClient.PostAsJsonAsync("/api/inventory-storage-units", new { name = maxName });
        Assert.Equal(HttpStatusCode.Created, maxNameResp.StatusCode);

        // Update validation
        var created = await CreateStorageUnitViaClient("For Update");
        var updateEmpty = await httpClient.PutAsJsonAsync($"/api/inventory-storage-units/{created.Id}", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, updateEmpty.StatusCode);

        var updateWs = await httpClient.PutAsJsonAsync($"/api/inventory-storage-units/{created.Id}", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, updateWs.StatusCode);

        var updateLong = await httpClient.PutAsJsonAsync($"/api/inventory-storage-units/{created.Id}", new { name = longName });
        Assert.Equal(HttpStatusCode.BadRequest, updateLong.StatusCode);
    }

    // --- Attachments ---

    [Fact]
    public async Task Attachments_UploadListDownloadDelete_WorkCorrectly()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var unit = await CreateStorageUnitViaClient("Unit With Photo");

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0xFF, 0xD8, 0xFF }); // JPEG magic bytes
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "unit.jpg");

        var uploadResponse = await httpClient.PostAsync(
            $"/api/inventory-storage-units/{unit.Id}/attachments?kind=Photo", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<AttachmentDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(uploaded);
        Assert.Equal("unit", uploaded.Name);
        Assert.Equal("Photo", uploaded.Kind);
        Assert.NotNull(uploaded.ThumbnailUrl);

        var listResponse = await httpClient.GetAsync($"/api/inventory-storage-units/{unit.Id}/attachments", TestContext.Current.CancellationToken);
        var attachments = await listResponse.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(attachments);
        Assert.Single(attachments);

        var downloadResponse = await httpClient.GetAsync(
            $"/api/inventory-storage-units/{unit.Id}/attachments/{attachments[0].Id}/download", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync(
            $"/api/inventory-storage-units/{unit.Id}/attachments/{attachments[0].Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await httpClient.GetAsync($"/api/inventory-storage-units/{unit.Id}/attachments", TestContext.Current.CancellationToken);
        var remaining = await afterDelete.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Empty(remaining!);
    }

    [Fact]
    public async Task Attachments_InvalidKind_ReturnsBadRequest()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var unit = await CreateStorageUnitViaClient("Unit");

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var response = await httpClient.PostAsync(
            $"/api/inventory-storage-units/{unit.Id}/attachments?kind=NotAKind", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Attachments_NotFound_WhenUnitDoesNotExist()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        var listResponse = await httpClient.GetAsync("/api/inventory-storage-units/99999/attachments", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, listResponse.StatusCode);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var uploadResponse = await httpClient.PostAsync("/api/inventory-storage-units/99999/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, uploadResponse.StatusCode);

        var downloadResponse = await httpClient.GetAsync("/api/inventory-storage-units/99999/attachments/1/download", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, downloadResponse.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync("/api/inventory-storage-units/99999/attachments/1", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Attachments_DownloadOrDelete_WhenAttachmentDoesNotExist_Returns404()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var unit = await CreateStorageUnitViaClient("Unit");

        var downloadResponse = await httpClient.GetAsync(
            $"/api/inventory-storage-units/{unit.Id}/attachments/99999/download", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, downloadResponse.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync(
            $"/api/inventory-storage-units/{unit.Id}/attachments/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    // --- Helpers ---

    private async Task<InventoryStorageUnitResponse> CreateStorageUnitViaClient(string name)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits.PostAsync(
            new KiotaModels.CreateInventoryStorageUnitRequest { Name = name });

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

    private record InventoryStorageUnitResponse(int Id, string Name, int? ParentId, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record InventoryBoxResponse(int Id, int Number, int? StorageUnitId, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record InventoryItemResponse(int Id, string Name, string? Description, int? BoxId, int? StorageUnitId, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record AttachmentDto(int Id, string Name, string ContentType, string Kind, string Url, string? ThumbnailUrl, int SortOrder, DateTime CreatedOn);
}
