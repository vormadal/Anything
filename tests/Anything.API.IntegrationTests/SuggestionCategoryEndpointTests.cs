using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class SuggestionCategoryEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _adminHttpClient;

    public SuggestionCategoryEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    private async Task<HttpClient> GetAdminClientAsync()
    {
        if (_adminHttpClient == null)
        {
            var token = await GetAdminTokenAsync();
            _adminHttpClient = GetAuthenticatedHttpClient(token);
        }
        return _adminHttpClient;
    }

    private async Task<CategoryDto> CreateCategoryAsync(string name)
    {
        var client = await GetAdminClientAsync();
        var response = await client.PostAsJsonAsync("/api/suggestion-categories", new { name });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CategoryDto>(JsonOptions))!;
    }

    // --- GET /api/suggestion-categories ---

    [Fact]
    public async Task GetCategories_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAdminClientAsync();
        var response = await client.GetAsync("/api/suggestion-categories");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCategories_RequiresAdminRole()
    {
        var response = await HttpClient.GetAsync("/api/suggestion-categories");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/suggestion-categories ---

    [Fact]
    public async Task CreateCategory_ReturnsCreatedCategory()
    {
        var client = await GetAdminClientAsync();
        var response = await client.PostAsJsonAsync("/api/suggestion-categories", new { name = "Dairy" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<CategoryDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Dairy", result.Name);
    }

    [Fact]
    public async Task CreateCategory_AppearsinList()
    {
        await CreateCategoryAsync("Produce");

        var client = await GetAdminClientAsync();
        var response = await client.GetAsync("/api/suggestion-categories");
        var result = await response.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);

        Assert.NotNull(result);
        Assert.Contains(result, c => c.Name == "Produce");
    }

    [Fact]
    public async Task CreateCategory_RequiresAdminRole()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/suggestion-categories", new { name = "Test" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateCategory_WithEmptyName_ReturnsBadRequest()
    {
        var client = await GetAdminClientAsync();
        var response = await client.PostAsJsonAsync("/api/suggestion-categories", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- PUT /api/suggestion-categories/{id} ---

    [Fact]
    public async Task UpdateCategory_UpdatesName()
    {
        var category = await CreateCategoryAsync("OldName");

        var client = await GetAdminClientAsync();
        var updateResponse = await client.PutAsJsonAsync($"/api/suggestion-categories/{category.Id}", new { name = "NewName" });
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/suggestion-categories");
        var result = await getResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result, c => c.Name == "NewName");
        Assert.DoesNotContain(result, c => c.Name == "OldName");
    }

    [Fact]
    public async Task UpdateCategory_ReturnsNotFoundForNonExistentId()
    {
        var client = await GetAdminClientAsync();
        var response = await client.PutAsJsonAsync("/api/suggestion-categories/99999", new { name = "Test" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- DELETE /api/suggestion-categories/{id} ---

    [Fact]
    public async Task DeleteCategory_RemovesFromList()
    {
        var category = await CreateCategoryAsync("ToDelete");

        var client = await GetAdminClientAsync();
        var deleteResponse = await client.DeleteAsync($"/api/suggestion-categories/{category.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/suggestion-categories");
        var result = await getResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.DoesNotContain(result, c => c.Name == "ToDelete");
    }

    [Fact]
    public async Task DeleteCategory_ReturnsNotFoundForNonExistentId()
    {
        var client = await GetAdminClientAsync();
        var response = await client.DeleteAsync("/api/suggestion-categories/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- PUT /api/suggestion-categories/reorder ---

    [Fact]
    public async Task ReorderCategories_ChangesOrder()
    {
        var cat1 = await CreateCategoryAsync("Alpha");
        var cat2 = await CreateCategoryAsync("Beta");
        var cat3 = await CreateCategoryAsync("Gamma");

        var client = await GetAdminClientAsync();
        var reorderResponse = await client.PutAsJsonAsync(
            "/api/suggestion-categories/reorder",
            new { ids = new[] { cat3.Id, cat1.Id, cat2.Id } });
        Assert.Equal(HttpStatusCode.NoContent, reorderResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/suggestion-categories");
        var result = await getResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(result);
        var ordered = result.ToList();
        Assert.Equal(cat3.Id, ordered[0].Id);
        Assert.Equal(cat1.Id, ordered[1].Id);
        Assert.Equal(cat2.Id, ordered[2].Id);
    }

    // --- GET /api/suggestion-categories/export ---

    [Fact]
    public async Task ExportCategories_WhenEmpty_ReturnsEmptyList()
    {
        var client = await GetAdminClientAsync();
        var response = await client.GetAsync("/api/suggestion-categories/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ExportDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Empty(result.Categories);
    }

    [Fact]
    public async Task ExportCategories_ReturnsAllCategories()
    {
        await CreateCategoryAsync("Fruits");
        await CreateCategoryAsync("Vegetables");

        var client = await GetAdminClientAsync();
        var response = await client.GetAsync("/api/suggestion-categories/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ExportDto>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result.Categories, c => c.Name == "Fruits");
        Assert.Contains(result.Categories, c => c.Name == "Vegetables");
    }

    [Fact]
    public async Task ExportCategories_RequiresAdminRole()
    {
        var response = await HttpClient.GetAsync("/api/suggestion-categories/export");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // --- POST /api/suggestion-categories/import ---

    [Fact]
    public async Task ImportCategories_AddsNewCategories()
    {
        var client = await GetAdminClientAsync();
        var importResponse = await client.PostAsJsonAsync("/api/suggestion-categories/import",
            new { categories = new[] { new { name = "Dairy" }, new { name = "Meat" } } });
        Assert.Equal(HttpStatusCode.NoContent, importResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/suggestion-categories");
        var result = await getResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(result);
        Assert.Contains(result, c => c.Name == "Dairy");
        Assert.Contains(result, c => c.Name == "Meat");
    }

    [Fact]
    public async Task ImportCategories_SkipsExistingCategoryNames()
    {
        await CreateCategoryAsync("Bakery");

        var client = await GetAdminClientAsync();
        var importResponse = await client.PostAsJsonAsync("/api/suggestion-categories/import",
            new { categories = new[] { new { name = "Bakery" }, new { name = "Seafood" } } });
        Assert.Equal(HttpStatusCode.NoContent, importResponse.StatusCode);

        var getResponse = await client.GetAsync("/api/suggestion-categories");
        var result = await getResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(result);
        // Bakery already existed — still only one entry
        Assert.Single(result.Where(c => c.Name == "Bakery"));
        // Seafood was new — should be added
        Assert.Contains(result, c => c.Name == "Seafood");
    }

    [Fact]
    public async Task ImportCategories_AssignsIncrementing_SortOrder()
    {
        var existing = await CreateCategoryAsync("Existing");

        var client = await GetAdminClientAsync();
        await client.PostAsJsonAsync("/api/suggestion-categories/import",
            new { categories = new[] { new { name = "NewA" }, new { name = "NewB" } } });

        var getResponse = await client.GetAsync("/api/suggestion-categories");
        var result = await getResponse.Content.ReadFromJsonAsync<CategoryDto[]>(JsonOptions);
        Assert.NotNull(result);

        var newA = result.FirstOrDefault(c => c.Name == "NewA");
        var newB = result.FirstOrDefault(c => c.Name == "NewB");
        Assert.NotNull(newA);
        Assert.NotNull(newB);
        // Imported categories should have a sort order higher than any existing one
        Assert.True(newA.SortOrder > existing.SortOrder);
        Assert.True(newB.SortOrder > newA.SortOrder);
    }

    [Fact]
    public async Task ImportCategories_RequiresAdminRole()
    {
        var response = await HttpClient.PostAsJsonAsync("/api/suggestion-categories/import",
            new { categories = new[] { new { name = "Test" } } });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ImportCategories_WithEmptyList_ReturnsNoContent()
    {
        var client = await GetAdminClientAsync();
        var response = await client.PostAsJsonAsync("/api/suggestion-categories/import",
            new { categories = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private record CategoryDto(int Id, string Name, int SortOrder);
    private record ExportDto(List<ExportCategoryItem> Categories);
    private record ExportCategoryItem(string Name);
}
