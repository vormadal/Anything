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

    // --- CRUD Lifecycle ---

    [Fact]
    public async Task CrudLifecycle_CreateReadUpdateDeleteWorkCorrectly()
    {
        var client = await GetAuthenticatedClientAsync();

        // Empty initially
        var emptyResult = await client.Api.InventoryItems.GetAsync();
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Create with all optional fields
        var unit = await CreateStorageUnitViaClient("Unit", null);
        var box = await CreateBoxViaClient(1, unit.Id);
        var created = await CreateItemViaClient("Test Item", "Test Description", box.Id, unit.Id);
        Assert.True(created.Id > 0);
        Assert.Equal("Test Item", created.Name);
        Assert.Equal("Test Description", created.Description);
        Assert.Equal(box.Id, created.BoxId);
        Assert.Equal(unit.Id, created.StorageUnitId);
        Assert.NotNull(created.CreatedOn);

        // Create without optional fields
        var minimal = await CreateItemViaClient("Minimal", null, null, null);
        Assert.Null(minimal.Description);
        Assert.Null(minimal.BoxId);
        Assert.Null(minimal.StorageUnitId);

        // List returns items
        var listResult = await client.Api.InventoryItems.GetAsync();
        Assert.NotNull(listResult);
        Assert.Equal(2, listResult.Count);

        // Get by ID
        var stream = await client.Api.InventoryItems[created.Id].GetAsync();
        Assert.NotNull(stream);
        var getResult = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(stream, JsonOptions);
        Assert.NotNull(getResult);
        Assert.Equal("Test Item", getResult.Name);
        Assert.Equal("Test Description", getResult.Description);

        // Update
        await client.Api.InventoryItems[created.Id].PutAsync(
            new KiotaModels.UpdateInventoryItemRequest
            {
                Name = "Updated",
                Description = "Updated Desc",
                BoxId = null,
                StorageUnitId = null
            });
        var updatedStream = await client.Api.InventoryItems[created.Id].GetAsync();
        Assert.NotNull(updatedStream);
        var updated = await JsonSerializer.DeserializeAsync<InventoryItemResponse>(updatedStream, JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("Updated", updated.Name);
        Assert.Equal("Updated Desc", updated.Description);
        Assert.NotNull(updated.ModifiedOn);

        // Delete
        await client.Api.InventoryItems[created.Id].DeleteAsync();
        var afterDelete = await client.Api.InventoryItems.GetAsync();
        Assert.NotNull(afterDelete);
        Assert.Single(afterDelete);
    }

    // --- Not Found / Deleted ---

    [Fact]
    public async Task Operations_OnNonExistentOrDeletedItem_Return404()
    {
        var client = await GetAuthenticatedClientAsync();

        var getEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[99999].GetAsync());
        Assert.Equal(404, getEx.ResponseStatusCode);

        var updateEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[99999].PutAsync(
                new KiotaModels.UpdateInventoryItemRequest
                {
                    Name = "Nope", Description = null, BoxId = null, StorageUnitId = null
                }));
        Assert.Equal(404, updateEx.ResponseStatusCode);

        var deleteEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[99999].DeleteAsync());
        Assert.Equal(404, deleteEx.ResponseStatusCode);

        // Deleted item
        var created = await CreateItemViaClient("Will Delete", null, null, null);
        await client.Api.InventoryItems[created.Id].DeleteAsync();

        var getDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[created.Id].GetAsync());
        Assert.Equal(404, getDeletedEx.ResponseStatusCode);

        var updateDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[created.Id].PutAsync(
                new KiotaModels.UpdateInventoryItemRequest
                {
                    Name = "Too Late", Description = null, BoxId = null, StorageUnitId = null
                }));
        Assert.Equal(404, updateDeletedEx.ResponseStatusCode);

        var deleteDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.InventoryItems[created.Id].DeleteAsync());
        Assert.Equal(404, deleteDeletedEx.ResponseStatusCode);
    }

    // --- Name / Description Validation ---

    [Fact]
    public async Task CreateAndUpdate_WithInvalidNameOrDescription_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var payload = new { name = "", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null };

        // Create: empty name
        var emptyName = await httpClient.PostAsJsonAsync("/api/inventory-items", payload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, emptyName.StatusCode);

        // Create: whitespace name
        var wsName = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = "   ", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, wsName.StatusCode);

        // Create: name > 200 chars
        var longName = new string('a', 201);
        var longNameResp = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = longName, description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, longNameResp.StatusCode);

        // Create: name at 200 chars succeeds
        var maxName = new string('a', 200);
        var maxNameResp = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = maxName, description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, maxNameResp.StatusCode);

        // Create: description > 1000 chars
        var longDesc = new string('b', 1001);
        var longDescResp = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = "Valid", description = longDesc, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, longDescResp.StatusCode);

        // Create: description at 1000 chars succeeds
        var maxDesc = new string('b', 1000);
        var maxDescResp = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = "Valid2", description = maxDesc, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, maxDescResp.StatusCode);

        // Update validation
        var created = await CreateItemViaClient("For Update", null, null, null);
        var updateEmpty = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = "", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateEmpty.StatusCode);

        var updateWs = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = "   ", description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateWs.StatusCode);

        var updateLongName = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = longName, description = (string?)null, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateLongName.StatusCode);

        var updateLongDesc = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = "Valid", description = longDesc, boxId = (int?)null, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateLongDesc.StatusCode);
    }

    // --- FK Validation ---

    [Fact]
    public async Task CreateAndUpdate_WithInvalidForeignKeys_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var client = await GetAuthenticatedClientAsync();

        // Create with invalid box
        var invalidBox = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = "Item", description = (string?)null, boxId = 99999, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, invalidBox.StatusCode);

        // Create with deleted box
        var box = await CreateBoxViaClient(1, null);
        await client.Api.InventoryBoxes[box.Id].DeleteAsync();
        var deletedBox = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = "Item", description = (string?)null, boxId = box.Id, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, deletedBox.StatusCode);

        // Create with invalid storage unit
        var invalidUnit = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = "Item", description = (string?)null, boxId = (int?)null, storageUnitId = 99999 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, invalidUnit.StatusCode);

        // Create with deleted storage unit
        var unit = await CreateStorageUnitViaClient("Deleted Unit", null);
        await client.Api.InventoryStorageUnits[unit.Id].DeleteAsync();
        var deletedUnit = await httpClient.PostAsJsonAsync("/api/inventory-items",
            new { name = "Item", description = (string?)null, boxId = (int?)null, storageUnitId = unit.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, deletedUnit.StatusCode);

        // Update with invalid FK
        var created = await CreateItemViaClient("Valid Item", null, null, null);

        var updateInvalidBox = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = "Valid", description = (string?)null, boxId = 99999, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateInvalidBox.StatusCode);

        var box2 = await CreateBoxViaClient(2, null);
        await client.Api.InventoryBoxes[box2.Id].DeleteAsync();
        var updateDeletedBox = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = "Valid", description = (string?)null, boxId = box2.Id, storageUnitId = (int?)null }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateDeletedBox.StatusCode);

        var updateInvalidUnit = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = "Valid", description = (string?)null, boxId = (int?)null, storageUnitId = 99999 }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateInvalidUnit.StatusCode);

        var unit2 = await CreateStorageUnitViaClient("Deleted Unit 2", null);
        await client.Api.InventoryStorageUnits[unit2.Id].DeleteAsync();
        var updateDeletedUnit = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}",
            new { name = "Valid", description = (string?)null, boxId = (int?)null, storageUnitId = unit2.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, updateDeletedUnit.StatusCode);
    }

    // --- Metadata ---

    [Fact]
    public async Task CreateAndUpdate_WithMetadataFields_RoundTripsCorrectly()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        var createPayload = new
        {
            name = "Drill",
            description = (string?)null,
            boxId = (int?)null,
            storageUnitId = (int?)null,
            quantity = 2,
            brand = "Bosch",
            model = "GSB 18",
            serialNumber = "SN-001",
            purchasedOn = new DateTime(2024, 5, 1, 0, 0, 0, DateTimeKind.Utc),
            purchasePrice = 149.99m,
            warrantyExpiresOn = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
            notes = "Bought at the hardware store"
        };
        var createResponse = await httpClient.PostAsJsonAsync("/api/inventory-items", createPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<FullItemDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);
        Assert.Equal(2, created.Quantity);
        Assert.Equal("Bosch", created.Brand);
        Assert.Equal("GSB 18", created.Model);
        Assert.Equal("SN-001", created.SerialNumber);
        Assert.Equal(149.99m, created.PurchasePrice);
        Assert.Equal("Bought at the hardware store", created.Notes);
        Assert.Empty(created.Fields);

        var getResponse = await httpClient.GetAsync($"/api/inventory-items/{created.Id}", TestContext.Current.CancellationToken);
        var fetched = await getResponse.Content.ReadFromJsonAsync<FullItemDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal("Bosch", fetched!.Brand);

        var updatePayload = new
        {
            name = "Drill",
            description = (string?)null,
            boxId = (int?)null,
            storageUnitId = (int?)null,
            quantity = 1,
            brand = "Makita",
            model = (string?)null,
            serialNumber = (string?)null,
            purchasedOn = (DateTime?)null,
            purchasePrice = (decimal?)null,
            warrantyExpiresOn = (DateTime?)null,
            notes = (string?)null
        };
        var updateResponse = await httpClient.PutAsJsonAsync($"/api/inventory-items/{created.Id}", updatePayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var afterUpdate = await httpClient.GetAsync($"/api/inventory-items/{created.Id}", TestContext.Current.CancellationToken);
        var updated = await afterUpdate.Content.ReadFromJsonAsync<FullItemDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal(1, updated!.Quantity);
        Assert.Equal("Makita", updated.Brand);
        Assert.Null(updated.Model);
        Assert.Null(updated.PurchasePrice);
    }

    [Fact]
    public async Task CreateInventoryItem_WithBoxInADifferentPlace_DerivesPlaceFromTheBox()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var boxsPlace = await CreateStorageUnitViaClient("Basement", null);
        var callersClaimedPlace = await CreateStorageUnitViaClient("Attic", null);
        var box = await CreateBoxViaClient(1, boxsPlace.Id);

        var payload = new
        {
            name = "Item",
            description = (string?)null,
            boxId = box.Id,
            storageUnitId = callersClaimedPlace.Id
        };
        var response = await httpClient.PostAsJsonAsync("/api/inventory-items", payload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<FullItemDto>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.Equal(box.Id, created!.BoxId);
        Assert.Equal(boxsPlace.Id, created.StorageUnitId);
    }

    // --- Custom fields ---

    [Fact]
    public async Task UpdateInventoryItemFields_ReplacesWholesaleAndValidates()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var item = await CreateItemViaClient("Item with fields", null, null, null);

        var setPayload = new { fields = new[] { new { label = "Warranty", value = "2 years" }, new { label = "Serial", value = "ABC" } } };
        var setResponse = await httpClient.PutAsJsonAsync($"/api/inventory-items/{item.Id}/fields", setPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, setResponse.StatusCode);
        var fields = await setResponse.Content.ReadFromJsonAsync<FieldDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(fields);
        Assert.Equal(2, fields.Length);
        Assert.Equal("Warranty", fields[0].Label);
        Assert.Equal(0, fields[0].SortOrder);

        // Wholesale replace: fewer fields on the second call fully replaces the first set.
        var replacePayload = new { fields = new[] { new { label = "Only", value = "one" } } };
        var replaceResponse = await httpClient.PutAsJsonAsync($"/api/inventory-items/{item.Id}/fields", replacePayload, TestContext.Current.CancellationToken);
        var replaced = await replaceResponse.Content.ReadFromJsonAsync<FieldDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Single(replaced!);

        var getResponse = await httpClient.GetAsync($"/api/inventory-items/{item.Id}", TestContext.Current.CancellationToken);
        var fetched = await getResponse.Content.ReadFromJsonAsync<FullItemDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Single(fetched!.Fields);
        Assert.Equal("Only", fetched.Fields[0].Label);

        // Validation: blank label rejected
        var invalidPayload = new { fields = new[] { new { label = "  ", value = "x" } } };
        var invalidResponse = await httpClient.PutAsJsonAsync($"/api/inventory-items/{item.Id}/fields", invalidPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
    }

    [Fact]
    public async Task UpdateInventoryItemFields_WhenItemNotFound_Returns404()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var payload = new { fields = new[] { new { label = "A", value = "b" } } };
        var response = await httpClient.PutAsJsonAsync("/api/inventory-items/99999/fields", payload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Attachments ---

    [Fact]
    public async Task Attachments_UploadListDownloadDelete_WorkCorrectly()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var item = await CreateItemViaClient("Item with attachments", null, null, null);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46 }); // %PDF magic bytes
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "manual.pdf");

        var uploadResponse = await httpClient.PostAsync(
            $"/api/inventory-items/{item.Id}/attachments?kind=Manual", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<AttachmentDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(uploaded);
        Assert.Equal("manual", uploaded.Name);
        Assert.Equal("Manual", uploaded.Kind);
        Assert.Null(uploaded.ThumbnailUrl);

        var listResponse = await httpClient.GetAsync($"/api/inventory-items/{item.Id}/attachments", TestContext.Current.CancellationToken);
        var attachments = await listResponse.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(attachments);
        Assert.Single(attachments);

        var downloadResponse = await httpClient.GetAsync(
            $"/api/inventory-items/{item.Id}/attachments/{attachments[0].Id}/download", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);

        var deleteResponse = await httpClient.DeleteAsync(
            $"/api/inventory-items/{item.Id}/attachments/{attachments[0].Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await httpClient.GetAsync($"/api/inventory-items/{item.Id}/attachments", TestContext.Current.CancellationToken);
        var remaining = await afterDelete.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Empty(remaining!);
    }

    [Fact]
    public async Task Attachments_ImageFile_HasThumbnailUrl()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var item = await CreateItemViaClient("Item with photo", null, null, null);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0xFF, 0xD8, 0xFF }); // JPEG magic bytes
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "item.jpg");

        var uploadResponse = await httpClient.PostAsync(
            $"/api/inventory-items/{item.Id}/attachments?kind=Photo", content, TestContext.Current.CancellationToken);
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<AttachmentDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(uploaded);
        Assert.NotNull(uploaded.ThumbnailUrl);
    }

    [Fact]
    public async Task Attachments_InvalidKind_ReturnsBadRequest()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var item = await CreateItemViaClient("Item", null, null, null);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var response = await httpClient.PostAsync(
            $"/api/inventory-items/{item.Id}/attachments?kind=NotAKind", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Attachments_NotFound_WhenItemDoesNotExist()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        var listResponse = await httpClient.GetAsync("/api/inventory-items/99999/attachments", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, listResponse.StatusCode);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var uploadResponse = await httpClient.PostAsync("/api/inventory-items/99999/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, uploadResponse.StatusCode);
    }

    // --- Helpers ---

    private async Task<InventoryItemResponse> CreateItemViaClient(string name, string? description, int? boxId, int? storageUnitId)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.InventoryItems.PostAsync(
            new KiotaModels.CreateInventoryItemRequest
            {
                Name = name, Description = description, BoxId = boxId, StorageUnitId = storageUnitId
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

    private record InventoryItemResponse(int Id, string Name, string? Description, int? BoxId, int? StorageUnitId, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record InventoryBoxResponse(int Id, int Number, int? StorageUnitId, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);
    private record InventoryStorageUnitResponse(int Id, string Name, string? Type, DateTime CreatedOn, DateTime? ModifiedOn, DateTime? DeletedOn);

    private record FullItemDto(
        int Id, string Name, string? Description, int? BoxId, int? StorageUnitId,
        int? Quantity, string? Brand, string? Model, string? SerialNumber,
        DateTime? PurchasedOn, decimal? PurchasePrice, DateTime? WarrantyExpiresOn, string? Notes,
        DateTime CreatedOn, DateTime? ModifiedOn, FieldDto[] Fields);

    private record FieldDto(int Id, string Label, string Value, int SortOrder);

    private record AttachmentDto(int Id, string Name, string ContentType, string Kind, string Url, string? ThumbnailUrl, int SortOrder, DateTime CreatedOn);
}
