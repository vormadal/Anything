using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Microsoft.Kiota.Abstractions;
using Xunit;
using KiotaModels = Anything.API.IntegrationTests.ApiClient.Models;

namespace Anything.API.IntegrationTests;

public class SomethingEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public SomethingEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    // --- GET /api/somethings ---

    [Fact]
    public async Task GetSomethings_WhenEmpty_ReturnsEmptyList()
    {
        var result = await Client.Api.Somethings.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSomethings_ReturnsSomethings()
    {
        await CreateSomethingViaClient("Item A");
        await CreateSomethingViaClient("Item B");

        var result = await Client.Api.Somethings.GetAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, s => s.Name == "Item A");
        Assert.Contains(result, s => s.Name == "Item B");
    }

    [Fact]
    public async Task GetSomethings_DoesNotReturnDeletedItems()
    {
        var created = await CreateSomethingViaClient("To Delete");
        await Client.Api.Somethings[created.Id].DeleteAsync();

        var result = await Client.Api.Somethings.GetAsync();

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // --- GET /api/somethings/{id} ---

    [Fact]
    public async Task GetSomethingById_ReturnsSomething()
    {
        var created = await CreateSomethingViaClient("Test Item");

        var stream = await Client.Api.Somethings[created.Id].GetAsync();

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
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => Client.Api.Somethings[99999].GetAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task GetSomethingById_WhenDeleted_Returns404()
    {
        var created = await CreateSomethingViaClient("Deleted Item");
        await Client.Api.Somethings[created.Id].DeleteAsync();

        var exception = await Assert.ThrowsAsync<ApiException>(
            () => Client.Api.Somethings[created.Id].GetAsync());

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

        var result = await Client.Api.Somethings.GetAsync();

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

        await Client.Api.Somethings[created.Id].PutAsync(
            new KiotaModels.UpdateSomethingRequest { Name = "Updated" });

        var result = await Client.Api.Somethings.GetAsync();
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Updated", result[0].Name);
    }

    [Fact]
    public async Task UpdateSomething_SetsModifiedOn()
    {
        var created = await CreateSomethingViaClient("Before Update");

        await Client.Api.Somethings[created.Id].PutAsync(
            new KiotaModels.UpdateSomethingRequest { Name = "After Update" });

        var stream = await Client.Api.Somethings[created.Id].GetAsync();
        Assert.NotNull(stream);
        var result = await JsonSerializer.DeserializeAsync<SomethingResponse>(stream, JsonOptions);
        Assert.NotNull(result);
        Assert.NotNull(result.ModifiedOn);
    }

    [Fact]
    public async Task UpdateSomething_WhenNotFound_Returns404()
    {
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => Client.Api.Somethings[99999].PutAsync(
                new KiotaModels.UpdateSomethingRequest { Name = "Nope" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task UpdateSomething_WhenDeleted_Returns404()
    {
        var created = await CreateSomethingViaClient("Will Delete");
        await Client.Api.Somethings[created.Id].DeleteAsync();

        var exception = await Assert.ThrowsAsync<ApiException>(
            () => Client.Api.Somethings[created.Id].PutAsync(
                new KiotaModels.UpdateSomethingRequest { Name = "Too Late" }));

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- DELETE /api/somethings/{id} ---

    [Fact]
    public async Task DeleteSomething_SoftDeletes()
    {
        var created = await CreateSomethingViaClient("Delete Me");

        await Client.Api.Somethings[created.Id].DeleteAsync();

        var result = await Client.Api.Somethings.GetAsync();
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task DeleteSomething_WhenNotFound_Returns404()
    {
        var exception = await Assert.ThrowsAsync<ApiException>(
            () => Client.Api.Somethings[99999].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    [Fact]
    public async Task DeleteSomething_WhenAlreadyDeleted_Returns404()
    {
        var created = await CreateSomethingViaClient("Double Delete");
        await Client.Api.Somethings[created.Id].DeleteAsync();

        var exception = await Assert.ThrowsAsync<ApiException>(
            () => Client.Api.Somethings[created.Id].DeleteAsync());

        Assert.Equal(404, exception.ResponseStatusCode);
    }

    // --- Helper ---

    private async Task<SomethingResponse> CreateSomethingViaClient(string name)
    {
        var stream = await Client.Api.Somethings.PostAsync(
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
