using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class UnitEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;
    private HttpClient? _userHttpClient;

    public UnitEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    private async Task<HttpClient> GetUserHttpClientAsync()
    {
        if (_userHttpClient == null)
        {
            var adminClient = await GetAuthenticatedHttpClientAsync();
            var inviteResponse = await adminClient.PostAsJsonAsync("/api/auth/invites", new { email = "user@test.com" });
            var inviteResult = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions);
            var inviteToken = inviteResult!.Token;

            await HttpClient.PostAsJsonAsync("/api/auth/register", new
            {
                email = "user@test.com",
                password = "User123!",
                name = "Test User",
                inviteToken
            });

            var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
            {
                email = "user@test.com",
                password = "User123!"
            });
            var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions);
            _userHttpClient = GetAuthenticatedHttpClient(loginResult!.AccessToken);
        }
        return _userHttpClient;
    }

    private async Task<UnitDto> CreateUnitAsync(string name)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/units", new { name });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UnitDto>(JsonOptions))!;
    }

    private async Task<UnitDto[]> GetUnitsAsync()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/units");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UnitDto[]>(JsonOptions))!;
    }

    // --- GET /api/units ---

    [Fact]
    public async Task GetUnits_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/units");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetUnits_ReturnsSeededDefaultsForNewHousehold()
    {
        // The admin's default household is created during setup, which seeds common units.
        var result = await GetUnitsAsync();
        Assert.NotEmpty(result);
        Assert.Contains(result, u => u.Name == "g");
        Assert.Contains(result, u => u.Name == "kg");
    }

    // --- POST /api/units ---

    [Fact]
    public async Task CreateUnit_AddsUnit()
    {
        await CreateUnitAsync("widget");

        var result = await GetUnitsAsync();
        Assert.Contains(result, u => u.Name == "widget");
    }

    [Fact]
    public async Task CreateUnit_WhenDuplicate_ReturnsConflict()
    {
        await CreateUnitAsync("gadget");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/units", new { name = "GADGET" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task CreateUnit_RequiresAdminRole()
    {
        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.PostAsJsonAsync("/api/units", new { name = "widget" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- PUT /api/units/{id} ---

    [Fact]
    public async Task UpdateUnit_RenamesUnit()
    {
        var unit = await CreateUnitAsync("gadget");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync($"/api/units/{unit.Id}", new { name = "gizmo" });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var result = await GetUnitsAsync();
        Assert.Contains(result, u => u.Name == "gizmo");
        Assert.DoesNotContain(result, u => u.Name == "gadget");
    }

    [Fact]
    public async Task UpdateUnit_ReturnsNotFoundForNonExistentId()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PutAsJsonAsync("/api/units/99999", new { name = "widget" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/units/{id} ---

    [Fact]
    public async Task DeleteUnit_RemovesUnit()
    {
        var unit = await CreateUnitAsync("sprocket");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync($"/api/units/{unit.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var result = await GetUnitsAsync();
        Assert.DoesNotContain(result, u => u.Name == "sprocket");
    }

    [Fact]
    public async Task DeleteUnit_ReturnsNotFoundForNonExistentId()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.DeleteAsync("/api/units/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUnit_RequiresAdminRole()
    {
        var unit = await CreateUnitAsync("cog");

        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.DeleteAsync($"/api/units/{unit.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- POST /api/units/seed-defaults ---

    [Fact]
    public async Task SeedDefaultUnits_IsIdempotentAndKeepsCommonUnits()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsync("/api/units/seed-defaults", null);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var result = await GetUnitsAsync();
        Assert.Contains(result, u => u.Name == "g");
        Assert.Contains(result, u => u.Name == "kg");
        // Idempotent: seeding again does not create duplicate "g" entries.
        Assert.Single(result.Where(u => u.Name == "g"));
    }

    [Fact]
    public async Task SeedDefaultUnits_RequiresAdminRole()
    {
        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.PostAsync("/api/units/seed-defaults", null);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- GET /api/units/export & POST /api/units/import ---

    [Fact]
    public async Task ExportUnits_ReturnsUnits()
    {
        await CreateUnitAsync("wibble");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.GetAsync("/api/units/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ExportDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result.Units, u => u.Name == "wibble");
        Assert.Contains(result.Units, u => u.Name == "g");
    }

    [Fact]
    public async Task ExportUnits_RequiresAdminRole()
    {
        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.GetAsync("/api/units/export");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ImportUnits_AddsNewUnits()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/units/import",
            new { units = new[] { new { name = "wobble" }, new { name = "wubble" } } });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var result = await GetUnitsAsync();
        Assert.Contains(result, u => u.Name == "wobble");
        Assert.Contains(result, u => u.Name == "wubble");
    }

    [Fact]
    public async Task ImportUnits_WithDeleteTrue_RemovesExistingUnit()
    {
        await CreateUnitAsync("flob");

        var client = await GetAuthenticatedHttpClientAsync();
        var response = await client.PostAsJsonAsync("/api/units/import",
            new { units = new[] { new { name = "flob", delete = true } } });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var result = await GetUnitsAsync();
        Assert.DoesNotContain(result, u => u.Name == "flob");
    }

    [Fact]
    public async Task ImportUnits_RequiresAdminRole()
    {
        var userClient = await GetUserHttpClientAsync();
        var response = await userClient.PostAsJsonAsync("/api/units/import",
            new { units = new[] { new { name = "widget" } } });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- Auto-remember ---

    [Fact]
    public async Task AddShoppingListItem_RemembersUnit()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var listResponse = await client.PostAsJsonAsync("/api/checklists", new { name = "Groceries" });
        var list = await listResponse.Content.ReadFromJsonAsync<ShoppingListDto>(JsonOptions);

        await client.PostAsJsonAsync($"/api/checklists/{list!.Id}/items", new { name = "Milk", amount = 2, unit = "liters" });

        var result = await GetUnitsAsync();
        Assert.Contains(result, u => u.Name == "liters");
    }

    [Fact]
    public async Task AddRecipeIngredient_RemembersUnit()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var recipeResponse = await client.PostAsJsonAsync("/api/recipes", new { name = "Cake" });
        var recipe = await recipeResponse.Content.ReadFromJsonAsync<RecipeDto>(JsonOptions);

        await client.PostAsJsonAsync($"/api/recipes/{recipe!.Id}/ingredients",
            new { name = "Flour", amount = 200, unit = "grams" });

        var result = await GetUnitsAsync();
        Assert.Contains(result, u => u.Name == "grams");
    }

    private record LoginResponse(string AccessToken, string RefreshToken, string Email, string Name, string Role);
    private record InviteResponse(string InviteUrl, string Token);
    private record UnitDto(int Id, string? Name);
    private record ShoppingListDto(int Id, string Name);
    private record RecipeDto(int Id, string Name);
    private record ExportDto(List<ExportUnitItem> Units);
    private record ExportUnitItem(string Name);
}
