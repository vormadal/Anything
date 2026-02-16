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

    // --- GET /api/somethings ---

    [Fact]
    public async Task GetSomethings_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Somethings.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSomethings_ReturnsSomethings()
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

    [Fact]
    public async Task GetSomethings_DoesNotReturnDeletedItems()
    {
        var created = await CreateSomethingViaClient("To Delete");
        await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Somethings.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/somethings/{id} ---

    [Fact]
    public async Task GetSomethingById_ReturnsSomething()
    {
        var created = await CreateSomethingViaClient("Test Item");

        var stream = await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].GetAsync();

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<SomethingResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal("Test Item", result.Name);
        Assert.NotNull(result.CreatedOn);
    }

    [Fact]
    public async Task GetSomethingById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetSomethingById_WhenDeleted_Returns404()
    {
        var created = await CreateSomethingViaClient("Deleted Item");
        await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[created.Id].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/somethings ---

    [Fact]
    public async Task CreateSomething_ReturnsCreatedItem()
    {
        var created = await CreateSomethingViaClient("New Item");

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal("New Item", created.Name);
        Assert.NotNull(created.CreatedOn);
    }

    [Fact]
    public async Task CreateSomething_IsRetrievableViaGet()
    {
        var created = await CreateSomethingViaClient("Retrievable");

        var result = await (await GetAuthenticatedClientAsync()).Api.Somethings.GetAsync();

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Retrievable", result[0].Name);
        Assert.Equal(created.Id, result[0].Id);
    }

    // --- PUT /api/somethings/{id} ---

    [Fact]
    public async Task UpdateSomething_UpdatesName()
    {
        var created = await CreateSomethingViaClient("Original");

        await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].PutAsync(
            new KiotaModels.UpdateSomethingRequest { Name = "Updated" });

        var result = await (await GetAuthenticatedClientAsync()).Api.Somethings.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Updated", result[0].Name);
    }

    [Fact]
    public async Task UpdateSomething_SetsModifiedOn()
    {
        var created = await CreateSomethingViaClient("Before Update");

        await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].PutAsync(
            new KiotaModels.UpdateSomethingRequest { Name = "After Update" });

        var stream = await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<SomethingResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateSomething_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[99999].PutAsync(
                new KiotaModels.UpdateSomethingRequest { Name = "Nope" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateSomething_WhenDeleted_Returns404()
    {
        var created = await CreateSomethingViaClient("Will Delete");
        await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[created.Id].PutAsync(
                new KiotaModels.UpdateSomethingRequest { Name = "Too Late" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/somethings/{id} ---

    [Fact]
    public async Task DeleteSomething_SoftDeletes()
    {
        var created = await CreateSomethingViaClient("Delete Me");

        await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Somethings.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteSomething_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteSomething_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateSomethingViaClient("Double Delete");
        await (await GetAuthenticatedClientAsync()).Api.Somethings[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Somethings[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/somethings validation ---

    [Fact]
    public async Task CreateSomething_WithEmptyName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/somethings", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateSomething_WithWhitespaceName_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/somethings", new { name = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateSomething_WithNameExceeding200Chars_Returns400()
    {
        var longName = new string('a', 201);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/somethings", new { name = longName });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateSomething_WithNameAt200Chars_Succeeds()
    {
        var maxName = new string('a', 200);
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/somethings", new { name = maxName });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // --- PUT /api/somethings/{id} validation ---

    [Fact]
    public async Task UpdateSomething_WithEmptyName_Returns400()
    {
        var created = await CreateSomethingViaClient("Valid Name");

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/somethings/{created.Id}", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSomething_WithWhitespaceName_Returns400()
    {
        var created = await CreateSomethingViaClient("Valid Name");

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/somethings/{created.Id}", new { name = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSomething_WithNameExceeding200Chars_Returns400()
    {
        var created = await CreateSomethingViaClient("Valid Name");
        var longName = new string('a', 201);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/somethings/{created.Id}", new { name = longName });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
