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
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    protected readonly PostgresContainerFixture Postgres;

    protected AnythingApiFactory Factory => Postgres.Factory;

    protected AnythingApiClient Client { get; private set; } = null!;
    protected HttpClient HttpClient { get; private set; } = null!;

    /// <summary>The household created for the admin user during test setup.</summary>
    protected int DefaultHouseholdId { get; private set; }

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

        // Create a default household for admin so authenticated requests pass the middleware.
        DefaultHouseholdId = await SetupAdminHouseholdAsync();
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    protected async Task<string> GetAdminTokenAsync()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@anything.local",
            password = "Admin123!"
        });

        var result = await response.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions);
        return result?.AccessToken ?? throw new InvalidOperationException("Failed to get admin token");
    }

    /// <summary>
    /// Returns an HTTP client with the Authorization header set.
    /// When <paramref name="householdId"/> is provided (or <see cref="DefaultHouseholdId"/> has been
    /// set up), the X-Household-Id header is also included so requests pass the household middleware.
    /// </summary>
    protected HttpClient GetAuthenticatedHttpClient(string token, int? householdId = null)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        var hid = householdId ?? (DefaultHouseholdId > 0 ? DefaultHouseholdId : (int?)null);
        if (hid.HasValue)
            client.DefaultRequestHeaders.Add("X-Household-Id", hid.Value.ToString());
        return client;
    }

    private async Task<int> SetupAdminHouseholdAsync()
    {
        var token = await GetAdminTokenAsync();
        // /api/households is exempt from household middleware, so use a plain auth client
        var authClient = Factory.CreateClient();
        authClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var response = await authClient.PostAsJsonAsync("/api/households", new { name = "Default" });
        response.EnsureSuccessStatusCode();

        var household = await response.Content.ReadFromJsonAsync<HouseholdResponse>(JsonOptions);
        return household?.Id ?? throw new InvalidOperationException("Failed to create default household");
    }

    private record LoginResponse(string AccessToken, string RefreshToken, string Email, string Name, string Role);
    private record HouseholdResponse(int Id, string Name, string CreatedOn);
}
