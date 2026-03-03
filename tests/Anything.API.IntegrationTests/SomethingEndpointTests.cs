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

public class SomethingEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private AnythingApiClient? _authenticatedClient;

    public SomethingEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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
        // List is initially empty
        var client = await GetAuthenticatedClientAsync();
        var emptyResult = await client.Api.Somethings.GetAsync();
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Create returns item with correct data
        var created = await CreateSomethingViaClient("New Item");
        Assert.True(created.Id > 0);
        Assert.Equal("New Item", created.Name);
        Assert.NotNull(created.CreatedOn);

        // Item appears in list
        var listResult = await client.Api.Somethings.GetAsync();
        Assert.NotNull(listResult);
        Assert.Single(listResult);
        Assert.Equal("New Item", listResult[0].Name);

        // Get by ID returns correct item
        var getStream = await client.Api.Somethings[created.Id].GetAsync();
        Assert.NotNull(getStream);
        var getResult = await JsonSerializer.DeserializeAsync<SomethingResponse>(getStream, JsonOptions);
        Assert.NotNull(getResult);
        Assert.Equal(created.Id, getResult.Id);
        Assert.Equal("New Item", getResult.Name);

        // Update changes the name and sets ModifiedOn
        await client.Api.Somethings[created.Id].PutAsync(
            new KiotaModels.UpdateSomethingRequest { Name = "Updated" });

        var updatedStream = await client.Api.Somethings[created.Id].GetAsync();
        Assert.NotNull(updatedStream);
        var updated = await JsonSerializer.DeserializeAsync<SomethingResponse>(updatedStream, JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("Updated", updated.Name);
        Assert.NotNull(updated.ModifiedOn);

        // Soft delete makes item disappear from list and by-ID
        await client.Api.Somethings[created.Id].DeleteAsync();
        var afterDelete = await client.Api.Somethings.GetAsync();
        Assert.NotNull(afterDelete);
        Assert.Empty(afterDelete);
    }

    // --- Multiple Items ---

    [Fact]
    public async Task GetSomethings_ReturnsMultipleItems()
    {
        await CreateSomethingViaClient("Item A");
        await CreateSomethingViaClient("Item B");

        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Somethings.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, s => s.Name == "Item A");
        Assert.Contains(result, s => s.Name == "Item B");
    }

    // --- Not Found / Deleted Scenarios ---

    [Fact]
    public async Task Operations_OnNonExistentOrDeletedItem_Return404()
    {
        var client = await GetAuthenticatedClientAsync();

        // Get non-existent
        var getException = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[99999].GetAsync());
        Assert.Equal(404, getException.ResponseStatusCode);

        // Update non-existent
        var updateException = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[99999].PutAsync(
                new KiotaModels.UpdateSomethingRequest { Name = "Nope" }));
        Assert.Equal(404, updateException.ResponseStatusCode);

        // Delete non-existent
        var deleteException = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[99999].DeleteAsync());
        Assert.Equal(404, deleteException.ResponseStatusCode);

        // Create then delete, then try all operations on deleted item
        var created = await CreateSomethingViaClient("Will Delete");
        await client.Api.Somethings[created.Id].DeleteAsync();

        var getDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[created.Id].GetAsync());
        Assert.Equal(404, getDeletedEx.ResponseStatusCode);

        var updateDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[created.Id].PutAsync(
                new KiotaModels.UpdateSomethingRequest { Name = "Too Late" }));
        Assert.Equal(404, updateDeletedEx.ResponseStatusCode);

        var deleteDeletedEx = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[created.Id].DeleteAsync());
        Assert.Equal(404, deleteDeletedEx.ResponseStatusCode);
    }

    // --- Validation ---

    [Fact]
    public async Task Create_WithInvalidName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();

        // Empty name
        var emptyResponse = await httpClient.PostAsJsonAsync("/api/somethings", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, emptyResponse.StatusCode);

        // Whitespace name
        var whitespaceResponse = await httpClient.PostAsJsonAsync("/api/somethings", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, whitespaceResponse.StatusCode);

        // Name exceeding 200 chars
        var longName = new string('a', 201);
        var longResponse = await httpClient.PostAsJsonAsync("/api/somethings", new { name = longName });
        Assert.Equal(HttpStatusCode.BadRequest, longResponse.StatusCode);

        // Name at 200 chars should succeed
        var maxName = new string('a', 200);
        var maxResponse = await httpClient.PostAsJsonAsync("/api/somethings", new { name = maxName });
        Assert.Equal(HttpStatusCode.Created, maxResponse.StatusCode);
    }

    [Fact]
    public async Task Update_WithInvalidName_Returns400()
    {
        var created = await CreateSomethingViaClient("Valid Name");
        var httpClient = await GetAuthenticatedHttpClientAsync();

        var emptyResponse = await httpClient.PutAsJsonAsync($"/api/somethings/{created.Id}", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, emptyResponse.StatusCode);

        var whitespaceResponse = await httpClient.PutAsJsonAsync($"/api/somethings/{created.Id}", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, whitespaceResponse.StatusCode);

        var longName = new string('a', 201);
        var longResponse = await httpClient.PutAsJsonAsync($"/api/somethings/{created.Id}", new { name = longName });
        Assert.Equal(HttpStatusCode.BadRequest, longResponse.StatusCode);
    }

    // --- Helper ---

    private async Task<SomethingResponse> CreateSomethingViaClient(string name)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.Somethings.PostAsync(
            new KiotaModels.CreateSomethingRequest { Name = name });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<SomethingResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private record SomethingResponse(
        int Id,
        string Name,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);
}
