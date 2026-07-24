using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class NoteEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private const string NotesRoute = "/api/notes";

    /// <summary>A minimal Tiptap document: one paragraph holding one text node.</summary>
    private const string SimpleDocument =
        """{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Guest network is open"}]}]}""";

    private HttpClient? _authenticatedHttpClient;

    public NoteEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    private async Task<NoteDto> CreateNote(HttpClient client, string title, string? contentJson = SimpleDocument)
    {
        var response = await client.PostAsJsonAsync(
            NotesRoute, new { title, contentJson }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<NoteDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);
        return created;
    }

    // --- CRUD ---

    [Fact]
    public async Task CrudLifecycle_CreateReadUpdateDeleteWorkCorrectly()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();

        var created = await CreateNote(client, $"Wifi {Guid.NewGuid()}");
        Assert.True(created.Id > 0);

        var getResponse = await client.GetAsync($"{NotesRoute}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var fetched = await getResponse.Content.ReadFromJsonAsync<NoteDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(fetched);
        Assert.Equal(SimpleDocument, fetched.ContentJson);

        var updateResponse = await client.PutAsJsonAsync(
            $"{NotesRoute}/{created.Id}",
            new { title = "Updated title", contentJson = SimpleDocument },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        var afterUpdate = await client.GetFromJsonAsync<NoteDto>(
            $"{NotesRoute}/{created.Id}", JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(afterUpdate);
        Assert.Equal("Updated title", afterUpdate.Title);

        var deleteResponse = await client.DeleteAsync($"{NotesRoute}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await client.GetAsync($"{NotesRoute}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    [Fact]
    public async Task CreateNote_DerivesPlainTextFromTheEditorDocument()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();

        var created = await CreateNote(client, $"Wifi {Guid.NewGuid()}");

        Assert.Equal("Guest network is open", created.ContentText);
    }

    [Fact]
    public async Task CreateNote_AcceptsAnEmptyBody()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();

        var created = await CreateNote(client, $"Empty {Guid.NewGuid()}", contentJson: null);

        Assert.Null(created.ContentJson);
        Assert.Equal(string.Empty, created.ContentText);
    }

    [Fact]
    public async Task CreateNote_WithBlankTitle_ReturnsBadRequest()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();

        var response = await client.PostAsJsonAsync(
            NotesRoute, new { title = "", contentJson = SimpleDocument }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // --- Listing ---

    [Fact]
    public async Task GetNotes_ReturnsSnippetsAndRespectsLimit()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        await CreateNote(client, $"First {Guid.NewGuid()}");
        await CreateNote(client, $"Second {Guid.NewGuid()}");

        var all = await client.GetFromJsonAsync<List<NoteSummaryDto>>(
            NotesRoute, JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(all);
        Assert.True(all.Count >= 2);
        Assert.Contains(all, n => n.Snippet == "Guest network is open");

        var limited = await client.GetFromJsonAsync<List<NoteSummaryDto>>(
            $"{NotesRoute}?limit=1", JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(limited);
        Assert.Single(limited);
    }

    [Fact]
    public async Task GetNotes_ExcludesDeletedNotes()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var title = $"Doomed {Guid.NewGuid()}";
        var created = await CreateNote(client, title);

        await client.DeleteAsync($"{NotesRoute}/{created.Id}", TestContext.Current.CancellationToken);

        var all = await client.GetFromJsonAsync<List<NoteSummaryDto>>(
            NotesRoute, JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(all);
        Assert.DoesNotContain(all, n => n.Title == title);
    }

    // --- Search integration ---

    [Fact]
    public async Task CreatedNote_IsFindableThroughSearch()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var title = $"Trampoline{Guid.NewGuid():N}";
        var created = await CreateNote(client, title);

        var results = await client.GetFromJsonAsync<List<SearchResultDto>>(
            $"/api/search?term={title}", JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(results);
        Assert.Contains(results, r => r.EntityType == "Note" && r.EntityId == created.Id);
    }

    [Fact]
    public async Task DeletedNote_IsRemovedFromSearch()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var title = $"Vanishing{Guid.NewGuid():N}";
        var created = await CreateNote(client, title);

        await client.DeleteAsync($"{NotesRoute}/{created.Id}", TestContext.Current.CancellationToken);

        var results = await client.GetFromJsonAsync<List<SearchResultDto>>(
            $"/api/search?term={title}", JsonOptions, TestContext.Current.CancellationToken);

        Assert.NotNull(results);
        Assert.DoesNotContain(results, r => r.EntityType == "Note" && r.EntityId == created.Id);
    }

    // --- Authorization ---

    [Fact]
    public async Task GetNotes_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync(NotesRoute, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private class NoteDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? ContentJson { get; set; }
        public string? ContentText { get; set; }
    }

    private class NoteSummaryDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Snippet { get; set; }
    }

    private class SearchResultDto
    {
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
    }
}
