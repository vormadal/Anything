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

public class BoxEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private AnythingApiClient? _authenticatedClient;

    public BoxEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- GET /api/boxes ---

    [Fact]
    public async Task GetBoxes_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Boxes.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetBoxes_ReturnsBoxes()
    {
        await CreateBoxViaClient(1, null);
        await CreateBoxViaClient(2, null);

        var client = await GetAuthenticatedClientAsync();
        var result = await client.Api.Boxes.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, b => b.Number == 1);
        Assert.Contains(result, b => b.Number == 2);
    }

    [Fact]
    public async Task GetBoxes_DoesNotReturnDeletedItems()
    {
        var created = await CreateBoxViaClient(1, null);
        await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Boxes.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/boxes/{id} ---

    [Fact]
    public async Task GetBoxById_ReturnsBox()
    {
        var created = await CreateBoxViaClient(42, null);

        var stream = await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].GetAsync();

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<BoxResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal(42, result.Number);
        Assert.NotNull(result.CreatedOn);
    }

    [Fact]
    public async Task GetBoxById_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Boxes[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetBoxById_WhenDeleted_Returns404()
    {
        var created = await CreateBoxViaClient(99, null);
        await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Boxes[created.Id].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/boxes ---

    [Fact]
    public async Task CreateBox_ReturnsCreatedItem()
    {
        var created = await CreateBoxViaClient(123, null);

        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal(123, created.Number);
        Assert.Null(created.StorageUnitId);
        Assert.NotNull(created.CreatedOn);
    }

    [Fact]
    public async Task CreateBox_IsRetrievableViaGet()
    {
        var created = await CreateBoxViaClient(456, null);

        var result = await (await GetAuthenticatedClientAsync()).Api.Boxes.GetAsync();

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(456, result[0].Number);
        Assert.Equal(created.Id, result[0].Id);
    }

    // --- PUT /api/boxes/{id} ---

    [Fact]
    public async Task UpdateBox_UpdatesNumber()
    {
        var created = await CreateBoxViaClient(10, null);

        await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].PutAsync(
            new KiotaModels.UpdateBoxRequest { Number = 20 });

        var result = await (await GetAuthenticatedClientAsync()).Api.Boxes.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(20, result[0].Number);
    }

    [Fact]
    public async Task UpdateBox_SetsModifiedOn()
    {
        var created = await CreateBoxViaClient(5, null);

        await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].PutAsync(
            new KiotaModels.UpdateBoxRequest { Number = 6 });

        var stream = await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<BoxResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateBox_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Boxes[99999].PutAsync(
                new KiotaModels.UpdateBoxRequest { Number = 999 }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateBox_WhenDeleted_Returns404()
    {
        var created = await CreateBoxViaClient(7, null);
        await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Boxes[created.Id].PutAsync(
                new KiotaModels.UpdateBoxRequest { Number = 8 }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/boxes/{id} ---

    [Fact]
    public async Task DeleteBox_SoftDeletes()
    {
        var created = await CreateBoxViaClient(100, null);

        await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].DeleteAsync();

        var result = await (await GetAuthenticatedClientAsync()).Api.Boxes.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteBox_WhenNotFound_Returns404()
    {
        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Boxes[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteBox_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateBoxViaClient(200, null);
        await (await GetAuthenticatedClientAsync()).Api.Boxes[created.Id].DeleteAsync();

        var client = await GetAuthenticatedClientAsync();
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => client.Api.Boxes[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- POST /api/boxes validation ---

    [Fact]
    public async Task CreateBox_WithMissingNumber_Returns400()
    {
        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PostAsJsonAsync("/api/boxes", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/boxes/{id} validation ---

    [Fact]
    public async Task UpdateBox_WithMissingNumber_Returns400()
    {
        var created = await CreateBoxViaClient(1, null);

        var httpClient = await GetAuthenticatedHttpClientAsync();
        var response = await httpClient.PutAsJsonAsync($"/api/boxes/{created.Id}", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Helper ---

    private async Task<BoxResponse> CreateBoxViaClient(int number, int? storageUnitId)
    {
        var stream = await (await GetAuthenticatedClientAsync()).Api.Boxes.PostAsync(
            new KiotaModels.CreateBoxRequest { Number = number, StorageUnitId = storageUnitId });

        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<BoxResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        return result;
    }

    private record BoxResponse(
        int Id,
        int Number,
        int? StorageUnitId,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        DateTime? DeletedOn);
}
