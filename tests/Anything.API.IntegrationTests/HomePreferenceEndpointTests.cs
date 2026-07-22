using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class HomePreferenceEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public HomePreferenceEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    private async Task<HttpClient> GetOrCreateAuthenticatedHttpClient()
    {
        if (_authenticatedHttpClient == null)
        {
            var token = await GetAdminTokenAsync();
            _authenticatedHttpClient = GetAuthenticatedHttpClient(token);
        }
        return _authenticatedHttpClient;
    }

    // --- GET /api/home/card-preferences ---

    [Fact]
    public async Task GetHomeCardPreferences_WhenNoneSaved_ReturnsDefaultCardsInOrder()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.GetAsync("/api/home/card-preferences", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<List<HomeCardPreferenceDto>>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        Assert.Equal(["quickcreate", "foodplan", "lists", "bills", "search"], result.Select(r => r.CardKey).ToList());
        Assert.All(result, r => Assert.True(r.IsVisible));
        Assert.Equal([0, 1, 2, 3, 4], result.Select(r => r.SortOrder).ToList());
    }

    [Fact]
    public async Task GetHomeCardPreferences_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/home/card-preferences", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- PUT /api/home/card-preferences ---

    [Fact]
    public async Task UpdateHomeCardPreferences_ReturnsNoContent()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PutAsJsonAsync("/api/home/card-preferences",
            new
            {
                cards = new[]
                {
                    new { cardKey = "bills", isVisible = true },
                    new { cardKey = "foodplan", isVisible = true },
                    new { cardKey = "lists", isVisible = true },
                }
            }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateHomeCardPreferences_PersistsOrderAndVisibility()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        await client.PutAsJsonAsync("/api/home/card-preferences",
            new
            {
                cards = new[]
                {
                    new { cardKey = "bills", isVisible = false },
                    new { cardKey = "foodplan", isVisible = true },
                    new { cardKey = "lists", isVisible = true },
                }
            }, TestContext.Current.CancellationToken);

        var getResponse = await client.GetAsync("/api/home/card-preferences", TestContext.Current.CancellationToken);
        var result = await getResponse.Content.ReadFromJsonAsync<List<HomeCardPreferenceDto>>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        // The three saved cards keep their order; the remaining known cards
        // (quickcreate, search) are appended as visible defaults.
        Assert.Equal(["bills", "foodplan", "lists", "quickcreate", "search"], result.Select(r => r.CardKey).ToList());
        Assert.False(result[0].IsVisible);
        Assert.True(result[1].IsVisible);
        Assert.True(result[2].IsVisible);
        Assert.True(result[3].IsVisible);
        Assert.True(result[4].IsVisible);
    }

    [Fact]
    public async Task UpdateHomeCardPreferences_WithEmptyCards_Returns400()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var response = await client.PutAsJsonAsync("/api/home/card-preferences",
            new { cards = Array.Empty<object>() }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateHomeCardPreferences_IsIsolatedPerHousehold()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        await client.PutAsJsonAsync("/api/home/card-preferences",
            new
            {
                cards = new[]
                {
                    new { cardKey = "bills", isVisible = false },
                    new { cardKey = "foodplan", isVisible = true },
                    new { cardKey = "lists", isVisible = true },
                }
            }, TestContext.Current.CancellationToken);

        var token = await GetAdminTokenAsync();
        var otherHouseholdClient = Factory.CreateClient();
        otherHouseholdClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        var createHouseholdResponse = await otherHouseholdClient.PostAsJsonAsync("/api/households",
            new { name = "Other household" }, TestContext.Current.CancellationToken);
        var otherHousehold = await createHouseholdResponse.Content.ReadFromJsonAsync<HouseholdDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(otherHousehold);
        otherHouseholdClient.DefaultRequestHeaders.Add("X-Household-Id", otherHousehold.Id.ToString());

        var response = await otherHouseholdClient.GetAsync("/api/home/card-preferences", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<List<HomeCardPreferenceDto>>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        Assert.All(result, r => Assert.True(r.IsVisible));
    }

    private record HomeCardPreferenceDto(string CardKey, int SortOrder, bool IsVisible);
    private record HouseholdDto(int Id, string Name);
}
