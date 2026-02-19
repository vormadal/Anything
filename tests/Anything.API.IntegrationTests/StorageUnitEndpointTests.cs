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

public class StorageUnitEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private AnythingApiClient? _authenticatedClient;

    public StorageUnitEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/storageunits ---

    [Fact]
    public async Task GetStorageUnits_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Storageunits.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetStorageUnits_ReturnsStorageUnits()
    {
        await CreateStorageUnitViaClient("Unit A", "Closet");
        await CreateStorageUnitViaClient("Unit B", "Garage");

        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Storageunits.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, s => s.Name == "Unit A");
        Assert.Contains(result, s => s.Name == "Unit B");
    }

    [Fact]
    public async Task GetStorageUnits_DoesNotReturnDeletedItems()
    {
        var created = await CreateStorageUnitViaClient("To Delete", null);
        await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Storageunits.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/storageunits/{id} ---

    [Fact]
    public async Task GetStorageUnitById_ReturnsStorageUnit()
    {
        var created = await CreateStorageUnitViaClient("Test Unit", "Attic");

        var stream = await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].GetAsync();

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<StorageUnitResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Test Unit", result.Name);
        Assert.Equal("Attic", result.Type);
        Assert.NotNull(result.CreatedOn);
    }

    [Fact]
    public async Task GetStorageUnitById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Storageunits[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetStorageUnitById_WhenDeleted_Returns404()
    {
        var created = await CreateStorageUnitViaClient("Deleted Unit", null);
        await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Storageunits[created.Id].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/storageunits ---

    [Fact]
    public async Task CreateStorageUnit_ReturnsCreatedItem()
    {
        var created = await CreateStorageUnitViaClient("New Unit", "Basement");

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("New Unit", created.Name);
        Assert.Equal("Basement", created.Type);
        Assert.NotNull(created.CreatedOn);
    }

    [Fact]
    public async Task CreateStorageUnit_IsRetrievableViaGet()
    {
        var created = await CreateStorageUnitViaClient("Retrievable", "Shed");

        var result = await (await GetAuthenticatedClientAsync()).Api.Storageunits.GetAsync();

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Retrievable", result[0].Name);
        Assert.Equal(created.Id, result[0].Id);
    }

    // --- PUT /api/storageunits/{id} ---

    [Fact]
    public async Task UpdateStorageUnit_UpdatesNameAndType()
    {
        var created = await CreateStorageUnitViaClient("Original", "Old Type");

        await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].PutAsync(
            new KiotaModels.UpdateStorageUnitRequest { Name = "Updated", Type = "New Type" });

        var result = await (await GetAuthenticatedClientAsync()).Api.Storageunits.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Updated", result[0].Name);
        Assert.Equal("New Type", result[0].Type);
    }

    [Fact]
    public async Task UpdateStorageUnit_SetsModifiedOn()
    {
        var created = await CreateStorageUnitViaClient("Before Update", null);

        await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].PutAsync(
            new KiotaModels.UpdateStorageUnitRequest { Name = "After Update" });

        var stream = await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<StorageUnitResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateStorageUnit_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Storageunits[99999].PutAsync(
                new KiotaModels.UpdateStorageUnitRequest { Name = "Nope" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateStorageUnit_WhenDeleted_Returns404()
    {
        var created = await CreateStorageUnitViaClient("Will Delete", null);
        await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Storageunits[created.Id].PutAsync(
                new KiotaModels.UpdateStorageUnitRequest { Name = "Too Late" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/storageunits/{id} ---

    [Fact]
    public async Task DeleteStorageUnit_SoftDeletes()
    {
        var created = await CreateStorageUnitViaClient("Delete Me", null);

        await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Storageunits.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteStorageUnit_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Storageunits[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteStorageUnit_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateStorageUnitViaClient("Double Delete", null);
        await (await GetAuthenticatedClientAsync()).Api.Storageunits[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Storageunits[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/storageunits validation ---

    [Fact]
    public async Task CreateStorageUnit_WithEmptyName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/storageunits", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateStorageUnit_WithWhitespaceName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/storageunits", new { name = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateStorageUnit_WithNameExceeding200Chars_Returns400()
    {
        var longName = new string('a', 201);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/storageunits", new { name = longName });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateStorageUnit_WithNameAt200Chars_Succeeds()
    {
        var maxName = new string('a', 200);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/storageunits", new { name = maxName });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateStorageUnit_WithTypeExceeding100Chars_Returns400()
    {
        var longType = new string('b', 101);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/storageunits", new { name = "Valid", type = longType });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateStorageUnit_WithTypeAt100Chars_Succeeds()
    {
        var maxType = new string('b', 100);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/storageunits", new { name = "Valid", type = maxType });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // --- PUT /api/storageunits/{id} validation ---

    [Fact]
    public async Task UpdateStorageUnit_WithEmptyName_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/storageunits/{created.Id}", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStorageUnit_WithWhitespaceName_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/storageunits/{created.Id}", new { name = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStorageUnit_WithNameExceeding200Chars_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);
        var longName = new string('a', 201);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/storageunits/{created.Id}", new { name = longName });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStorageUnit_WithTypeExceeding100Chars_Returns400()
    {
        var created = await CreateStorageUnitViaClient("Valid Name", null);
        var longType = new string('b', 101);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/storageunits/{created.Id}", new { name = "Valid", type = longType });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Helper ---

    private async Task<StorageUnitResponse> CreateStorageUnitViaClient(string name, string? type)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.Storageunits.PostAsync(
            new KiotaModels.CreateStorageUnitRequest { Name = name, Type = type });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<StorageUnitResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private record StorageUnitResponse(
        int Id,
        string Name,
        string? Type,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);
}
