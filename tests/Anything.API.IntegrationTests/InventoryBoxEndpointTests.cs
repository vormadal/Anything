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

    // --- CRUD Lifecycle ---

    [Fact]
    public async Task CrudLifecycle_CreateReadUpdateDeleteWorkCorrectly()
    {
        var client = await GetAuthenticatedClientAsync();

        // Empty initially
        var emptyResult = await client.Api.InventoryBoxes.GetAsync();
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Create without storage unit
        var created = await CreateBoxViaClient(100, null);
        Assert.True(created.Id > 0);
        Assert.Equal(100, created.Number);
        Assert.Null(created.StorageUnitId);
        Assert.NotNull(created.CreatedOn);

        // Create with storage unit
        var unit = await CreateStorageUnitViaClient("Test Unit", null);
        var withUnit = await CreateBoxViaClient(200, unit.Id);
        Assert.Equal(unit.Id, withUnit.StorageUnitId);

        // List returns boxes
        var listResult = await client.Api.InventoryBoxes.GetAsync();
        Assert.NotNull(listResult);
        Assert.Equal(2, listResult.Count);

        // Get by ID
        var stream = await client.Api.InventoryBoxes[withUnit.Id].GetAsync();
        Assert.NotNull(stream);
        var getResult = await JsonSerializer.DeserializeAsync<InventoryBoxResponse>(stream, JsonOptions);
        Assert.NotNull(getResult);
        Assert.Equal(200, getResult.Number);
        Assert.Equal(unit.Id, getResult.StorageUnitId);

        // Update
        await client.Api.InventoryBoxes[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryBoxRequest { Number = 999, StorageUnitId = unit.Id });
        var updatedStream = await client.Api.InventoryBoxes[created.Id].GetAsync();
        Assert.NotNull(updatedStream);
        var updated = await JsonSerializer.DeserializeAsync<InventoryBoxResponse>(updatedStream, JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal(999, updated.Number);
        Assert.Equal(unit.Id, updated.StorageUnitId);
        Assert.NotNull(updated.ModifiedOn);

        // Delete
        await client.Api.InventoryBoxes[created.Id].DeleteAsync();
        var afterDelete = await client.Api.InventoryBoxes.GetAsync();
        Assert.NotNull(afterDelete);
        Assert.Single(afterDelete);
    }

    // --- Not Found / Deleted ---

    [Fact]
    public async Task Operations_OnNonExistentOrDeletedBox_Return404()
    {
        var client = await GetAuthenticatedClientAsync();

        var getEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[99999].GetAsync());
        Assert.Equal(404, getEx.ResponseStatusCode);

        var updateEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[99999].PutAsync(
                new KiotaModels.UpdateInventoryBoxRequest { Number = 1, StorageUnitId = null }));
        Assert.Equal(404, updateEx.ResponseStatusCode);

        var deleteEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[99999].DeleteAsync());
        Assert.Equal(404, deleteEx.ResponseStatusCode);

        // Deleted item
        var created = await CreateBoxViaClient(1, null);
        await client.Api.InventoryBoxes[created.Id].DeleteAsync();

        var getDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[created.Id].GetAsync());
        Assert.Equal(404, getDeletedEx.ResponseStatusCode);

        var updateDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[created.Id].PutAsync(
                new KiotaModels.UpdateInventoryBoxRequest { Number = 2, StorageUnitId = null }));
        Assert.Equal(404, updateDeletedEx.ResponseStatusCode);

        var deleteDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryBoxes[created.Id].DeleteAsync());
        Assert.Equal(404, deleteDeletedEx.ResponseStatusCode);
    }

    // --- Delete Cascading Behavior ---

    [Fact]
    public async Task Delete_NullifiesBoxIdOnAssociatedItems()
    {
        var client = await GetAuthenticatedClientAsync();
        var box = await CreateBoxViaClient(1, null);
        var item1 = await CreateItemViaClient("Item 1", box.Id, null);
        var item2 = await CreateItemViaClient("Item 2", box.Id, null);

        await client.Api.InventoryBoxes[box.Id].DeleteAsync();

        var items = await client.Api.InventoryItems.GetAsync();
        Assert.NotNull(items);
        Assert.Equal(2, items.Count);
        Assert.All(items, item => Assert.Null(item.BoxId));
    }

    // --- FK Validation ---

    [Fact]
    public async Task CreateAndUpdate_WithInvalidStorageUnit_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        // Create with invalid storage unit
        var invalidCreate = await httpClient.PostAsJsonAsync("/api/inventory-boxes", new { number = 1, storageUnitId = 99999 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, invalidCreate.StatusCode);

        // Create with deleted storage unit
        var unit = await CreateStorageUnitViaClient("Deleted Unit", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[unit.Id].DeleteAsync();

        var deletedCreate = await httpClient.PostAsJsonAsync("/api/inventory-boxes", new { number = 1, storageUnitId = unit.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, deletedCreate.StatusCode);

        // Update with invalid storage unit
        var box = await CreateBoxViaClient(1, null);
        var invalidUpdate = await httpClient.PutAsJsonAsync($"/api/inventory-boxes/{box.Id}", new { number = 1, storageUnitId = 99999 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, invalidUpdate.StatusCode);

        // Update with deleted storage unit
        var unit2 = await CreateStorageUnitViaClient("Deleted Unit 2", null);
        await (await GetAuthenticatedClientAsync()).Api.InventoryStorageUnits[unit2.Id].DeleteAsync();
        var deletedUpdate = await httpClient.PutAsJsonAsync($"/api/inventory-boxes/{box.Id}", new { number = 1, storageUnitId = unit2.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, deletedUpdate.StatusCode);
    }

    // --- Attachments ---

    [Fact]
    public async Task Attachments_UploadListDownloadDelete_WorkCorrectly()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var box = await CreateBoxViaClient(1, null);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46 }); // %PDF magic bytes
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "manual.pdf");

        var uploadResponse = await httpClient.PostAsync(
            $"/api/inventory-boxes/{box.Id}/attachments?kind=Manual", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<AttachmentDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(uploaded);
        Assert.Equal("manual", uploaded.Name);
        Assert.Equal("Manual", uploaded.Kind);

        var listResponse = await httpClient.GetAsync($"/api/inventory-boxes/{box.Id}/attachments", TestContext.Current.CancellationToken);
        var attachments = await listResponse.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(attachments);
        Assert.Single(attachments);

        var downloadResponse = await httpClient.GetAsync(
            $"/api/inventory-boxes/{box.Id}/attachments/{attachments[0].Id}/download", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync(
            $"/api/inventory-boxes/{box.Id}/attachments/{attachments[0].Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await httpClient.GetAsync($"/api/inventory-boxes/{box.Id}/attachments", TestContext.Current.CancellationToken);
        var remaining = await afterDelete.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Empty(remaining!);
    }

    [Fact]
    public async Task Attachments_InvalidKind_ReturnsBadRequest()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var box = await CreateBoxViaClient(1, null);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var response = await httpClient.PostAsync(
            $"/api/inventory-boxes/{box.Id}/attachments?kind=NotAKind", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Attachments_NotFound_WhenBoxDoesNotExist()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        var listResponse = await httpClient.GetAsync("/api/inventory-boxes/99999/attachments", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, listResponse.StatusCode);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var uploadResponse = await httpClient.PostAsync("/api/inventory-boxes/99999/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, uploadResponse.StatusCode);

        var downloadResponse = await httpClient.GetAsync("/api/inventory-boxes/99999/attachments/1/download", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, downloadResponse.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync("/api/inventory-boxes/99999/attachments/1", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Attachments_DownloadOrDelete_WhenAttachmentDoesNotExist_Returns404()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var box = await CreateBoxViaClient(1, null);

        var downloadResponse = await httpClient.GetAsync(
            $"/api/inventory-boxes/{box.Id}/attachments/99999/download", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, downloadResponse.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync(
            $"/api/inventory-boxes/{box.Id}/attachments/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    // --- Helpers ---

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

    private record InventoryBoxResponse(int Id, int Number, int? StorageUnitId, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record InventoryStorageUnitResponse(int Id, string Name, string? Type, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record InventoryItemResponse(int Id, string Name, string? Description, int? BoxId, int? StorageUnitId, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record AttachmentDto(int Id, string Name, string ContentType, string Kind, string Url, string? ThumbnailUrl, int SortOrder, DateTime CreatedOn);
}
