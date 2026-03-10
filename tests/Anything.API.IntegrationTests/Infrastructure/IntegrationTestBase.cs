using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.ApiClient;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using Xunit;

namespace Anything.API.IntegrationTests.Infrastructure;

[Collection(IntegrationTestCollection.Name)]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly PostgresContainerFixture Postgres;

    protected AnythingApiFactory Factory => Postgres.Factory;

    protected AnythingApiClient Client { get; private set; } = null!;
    protected HttpClient HttpClient { get; private set; } = null!;

    protected IntegrationTestBase(PostgresContainerFixture postgres)
    {
        Postgres = postgres;
    }

    public async ValueTask InitializeAsync()
    {
        await Factory.ResetDatabaseAsync();

        var httpClient = Factory.CreateClient();
        HttpClient = Factory.CreateClient();
        var adapter = new HttpClientRequestAdapter(
            new AnonymousAuthenticationProvider(),
            httpClient: httpClient)
        {
            BaseUrl = httpClient.BaseAddress?.ToString().TrimEnd('/') ?? ""
        };
        Client = new AnythingApiClient(adapter);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    protected async Task<string> GetAdminTokenAsync()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@anything.local",
            password = "Admin123!"
        });

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>(options);
        return result?.AccessToken ?? throw new InvalidOperationException("Failed to get admin token");
    }

    protected HttpClient GetAuthenticatedHttpClient(string token)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        return client;
    }

    private record LoginResponse(string AccessToken, string RefreshToken, string Email, string Name, string Role);
}
