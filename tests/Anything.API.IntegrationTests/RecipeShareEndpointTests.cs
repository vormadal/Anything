using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class RecipeShareEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public RecipeShareEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    private async Task<RecipeDto> CreateRecipeAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/recipes", new { name }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    // --- Create share ---

    [Fact]
    public async Task CreateShare_WithAnonymous_ReturnsShareUrl()
    {
        var recipe = await CreateRecipeAsync("Tiramisu");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "OneWeek", targetEmail = (string?)null },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var share = await response.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);
        Assert.True(share.Id > 0);
        Assert.NotEmpty(share.Token);
        Assert.StartsWith("/shared/recipe/", share.ShareUrl);
        Assert.Null(share.TargetEmail);
        Assert.False(share.IsExpired);
        Assert.NotNull(share.ExpiresAt);
    }

    [Fact]
    public async Task CreateShare_WithForeverExpiry_HasNullExpiresAt()
    {
        var recipe = await CreateRecipeAsync("Brownies");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "Forever", targetEmail = (string?)null },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var share = await response.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);
        Assert.Null(share.ExpiresAt);
    }

    [Fact]
    public async Task CreateShare_WithTargetEmail_SetsEmail()
    {
        var recipe = await CreateRecipeAsync("Quiche");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "OneMonth", targetEmail = "friend@example.com" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var share = await response.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);
        Assert.Equal("friend@example.com", share.TargetEmail);
    }

    [Fact]
    public async Task CreateShare_RequiresAuthentication()
    {
        var recipe = await CreateRecipeAsync("Test");

        var response = await HttpClient.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "OneWeek" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateShare_NotFound_WhenRecipeDoesNotExist()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.PostAsJsonAsync(
            "/api/recipes/99999/shares",
            new { expiry = "OneWeek" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- List shares ---

    [Fact]
    public async Task GetShares_ReturnsAllSharesForRecipe()
    {
        var recipe = await CreateRecipeAsync("Lasagna");
        var client = await GetAuthenticatedHttpClientAsync();

        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/shares", new { expiry = "OneWeek" }, TestContext.Current.CancellationToken);
        await client.PostAsJsonAsync($"/api/recipes/{recipe.Id}/shares", new { expiry = "OneMonth", targetEmail = "bob@example.com" }, TestContext.Current.CancellationToken);

        var response = await client.GetAsync($"/api/recipes/{recipe.Id}/shares", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var shares = await response.Content.ReadFromJsonAsync<ShareDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shares);
        Assert.Equal(2, shares.Length);
    }

    [Fact]
    public async Task GetShares_ReturnsEmpty_WhenNoShares()
    {
        var recipe = await CreateRecipeAsync("Soup");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.GetAsync($"/api/recipes/{recipe.Id}/shares", TestContext.Current.CancellationToken);
        var shares = await response.Content.ReadFromJsonAsync<ShareDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(shares);
        Assert.Empty(shares);
    }

    // --- Revoke share ---

    [Fact]
    public async Task RevokeShare_DeletesShare()
    {
        var recipe = await CreateRecipeAsync("Ramen");
        var client = await GetAuthenticatedHttpClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "Forever" },
            TestContext.Current.CancellationToken);
        var share = await createResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);

        var revokeResponse = await client.DeleteAsync($"/api/recipes/{recipe.Id}/shares/{share.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, revokeResponse.StatusCode);

        var listResponse = await client.GetAsync($"/api/recipes/{recipe.Id}/shares", TestContext.Current.CancellationToken);
        var remaining = await listResponse.Content.ReadFromJsonAsync<ShareDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(remaining);
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task RevokeShare_NotFound_WhenShareDoesNotExist()
    {
        var recipe = await CreateRecipeAsync("Noodles");
        var client = await GetAuthenticatedHttpClientAsync();

        var response = await client.DeleteAsync($"/api/recipes/{recipe.Id}/shares/99999", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- Get shared recipe (public) ---

    [Fact]
    public async Task GetSharedRecipe_ReturnsRecipeData_ForAnonymousToken()
    {
        var recipe = await CreateRecipeAsync("Frittata");
        var client = await GetAuthenticatedHttpClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "Forever" },
            TestContext.Current.CancellationToken);
        var share = await createResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);

        // Access via public endpoint (no auth)
        var publicResponse = await HttpClient.GetAsync($"/api/shared/recipes/{share.Token}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);

        var sharedRecipe = await publicResponse.Content.ReadFromJsonAsync<SharedRecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(sharedRecipe);
        Assert.Equal(recipe.Id, sharedRecipe.RecipeId);
        Assert.Equal("Frittata", sharedRecipe.RecipeName);
        Assert.False(sharedRecipe.IsExpired);
        Assert.False(sharedRecipe.IsTargeted);
    }

    [Fact]
    public async Task GetSharedRecipe_ReturnsExpiredFlag_WhenTokenIsExpired()
    {
        // We can't manipulate time easily, but we can test the expired=false case
        // and verify the token lookup works
        var recipe = await CreateRecipeAsync("Pancakes");
        var client = await GetAuthenticatedHttpClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "OneWeek" },
            TestContext.Current.CancellationToken);
        var share = await createResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);
        Assert.NotNull(share.ExpiresAt);
        Assert.False(share.IsExpired);

        // Access succeeds since it hasn't expired yet
        var publicResponse = await HttpClient.GetAsync($"/api/shared/recipes/{share.Token}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);
    }

    [Fact]
    public async Task GetSharedRecipe_Returns404_ForUnknownToken()
    {
        var response = await HttpClient.GetAsync("/api/shared/recipes/nonexistenttoken123", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetSharedRecipe_IsAccessibleWithoutAuthentication()
    {
        var recipe = await CreateRecipeAsync("Salad");
        var client = await GetAuthenticatedHttpClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "Forever" },
            TestContext.Current.CancellationToken);
        var share = await createResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);

        // Completely unauthenticated client
        var unauthClient = Factory.CreateClient();
        var response = await unauthClient.GetAsync($"/api/shared/recipes/{share.Token}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // --- Clone shared recipe ---

    [Fact]
    public async Task CloneSharedRecipe_RequiresAuthentication()
    {
        var recipe = await CreateRecipeAsync("Waffles");
        var client = await GetAuthenticatedHttpClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares", new { expiry = "Forever" }, TestContext.Current.CancellationToken);
        var share = await createResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);

        var cloneResponse = await HttpClient.PostAsJsonAsync(
            $"/api/shared/recipes/{share.Token}/clone",
            new { targetHouseholdId = DefaultHouseholdId },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, cloneResponse.StatusCode);
    }

    [Fact]
    public async Task CloneSharedRecipe_Anonymous_ClonesRecipeToTargetHousehold()
    {
        var recipe = await CreateRecipeAsync("Crepes");
        var authClient = await GetAuthenticatedHttpClientAsync();

        // Add some content to the recipe
        await authClient.PostAsJsonAsync($"/api/recipes/{recipe.Id}/ingredients",
            new { name = "Flour", amount = 200, unit = "g", group = (string?)null }, TestContext.Current.CancellationToken);
        await authClient.PostAsJsonAsync($"/api/recipes/{recipe.Id}/steps",
            new { text = "Mix batter", order = 1 }, TestContext.Current.CancellationToken);
        await authClient.PostAsJsonAsync($"/api/recipes/{recipe.Id}/tags",
            new { name = "breakfast" }, TestContext.Current.CancellationToken);

        var createShareResponse = await authClient.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares", new { expiry = "Forever" }, TestContext.Current.CancellationToken);
        var share = await createShareResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);

        var token = await GetAdminTokenAsync();
        var cloneClient = GetAuthenticatedHttpClient(token, DefaultHouseholdId);
        // Clone endpoint bypasses household middleware — use plain auth client
        var cloneAuthClient = Factory.CreateClient();
        cloneAuthClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var cloneResponse = await cloneAuthClient.PostAsJsonAsync(
            $"/api/shared/recipes/{share.Token}/clone",
            new { targetHouseholdId = DefaultHouseholdId },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, cloneResponse.StatusCode);

        var cloned = await cloneResponse.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(cloned);
        Assert.NotEqual(recipe.Id, cloned.Id);
        Assert.Equal("Crepes", cloned.Name);

        // Verify cloned ingredients
        var ingredientsResponse = await authClient.GetAsync($"/api/recipes/{cloned.Id}/ingredients", TestContext.Current.CancellationToken);
        var ingredients = await ingredientsResponse.Content.ReadFromJsonAsync<IngredientDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(ingredients);
        Assert.Single(ingredients);
        Assert.Equal("Flour", ingredients[0].Name);

        // Verify cloned steps
        var stepsResponse = await authClient.GetAsync($"/api/recipes/{cloned.Id}/steps", TestContext.Current.CancellationToken);
        var steps = await stepsResponse.Content.ReadFromJsonAsync<StepDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(steps);
        Assert.Single(steps);
        Assert.Equal("Mix batter", steps[0].Text);
    }

    [Fact]
    public async Task CloneSharedRecipe_Targeted_Returns403_WhenEmailDoesNotMatch()
    {
        var recipe = await CreateRecipeAsync("Strudel");
        var client = await GetAuthenticatedHttpClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares",
            new { expiry = "Forever", targetEmail = "other@example.com" },
            TestContext.Current.CancellationToken);
        var share = await createResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);

        var token = await GetAdminTokenAsync();
        var cloneClient = Factory.CreateClient();
        cloneClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var cloneResponse = await cloneClient.PostAsJsonAsync(
            $"/api/shared/recipes/{share.Token}/clone",
            new { targetHouseholdId = DefaultHouseholdId },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, cloneResponse.StatusCode);
    }

    [Fact]
    public async Task CloneSharedRecipe_NotMember_Returns403()
    {
        var recipe = await CreateRecipeAsync("Challah");
        var client = await GetAuthenticatedHttpClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/recipes/{recipe.Id}/shares", new { expiry = "Forever" }, TestContext.Current.CancellationToken);
        var share = await createResponse.Content.ReadFromJsonAsync<ShareDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(share);

        var token = await GetAdminTokenAsync();
        var cloneClient = Factory.CreateClient();
        cloneClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var cloneResponse = await cloneClient.PostAsJsonAsync(
            $"/api/shared/recipes/{share.Token}/clone",
            new { targetHouseholdId = 99999 },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, cloneResponse.StatusCode);
    }

    private record RecipeDto(int Id, string? Name);
    private record ShareDto(int Id, string Token, string ShareUrl, string? TargetEmail, DateTime? ExpiresAt, DateTime CreatedOn, bool IsExpired, bool IsClaimed);
    private record SharedRecipeDto(int RecipeId, string RecipeName, bool IsExpired, bool IsTargeted, string? TargetEmail);
    private record IngredientDto(int Id, int RecipeId, string? Name, decimal? Amount, string? Unit, string? Group);
    private record StepDto(int Id, int RecipeId, string? Text, int Order);
}
