using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

/// <summary>
/// Covers the ticket-based SSE handshake — see SseTicketService for why
/// /api/events doesn't use ordinary JWT bearer auth.
/// </summary>
public class EventsEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public EventsEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    private async Task<string> IssueTicket(HttpClient client)
    {
        var response = await client.PostAsync("/api/events/ticket", null, TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<TicketDto>(JsonOptions, TestContext.Current.CancellationToken);
        return dto!.Ticket;
    }

    [Fact]
    public async Task CreateTicket_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await HttpClient.PostAsync("/api/events/ticket", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateTicket_WithAuth_ReturnsNonEmptyTicket()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();

        var ticket = await IssueTicket(client);

        Assert.False(string.IsNullOrEmpty(ticket));
    }

    [Fact]
    public async Task CreateTicket_WithoutHouseholdHeader_ReturnsBadRequest()
    {
        var token = await GetAdminTokenAsync();
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

        var response = await client.PostAsync("/api/events/ticket", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateTicket_WhenNotAHouseholdMember_ReturnsForbidden()
    {
        var token = await GetAdminTokenAsync();
        var client = GetAuthenticatedHttpClient(token, householdId: 999999);

        var response = await client.PostAsync("/api/events/ticket", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Connect_WithoutTicket_ReturnsUnauthorized()
    {
        var response = await HttpClient.GetAsync("/api/events", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Connect_WithInvalidTicket_ReturnsUnauthorized()
    {
        var response = await HttpClient.GetAsync("/api/events?ticket=not-a-real-ticket", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Connect_WithValidTicket_OpensEventStream()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var ticket = await IssueTicket(client);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10));

        using var response = await HttpClient.GetAsync(
            $"/api/events?ticket={ticket}", HttpCompletionOption.ResponseHeadersRead, cts.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/event-stream", response.Content.Headers.ContentType?.MediaType);

        await using var stream = await response.Content.ReadAsStreamAsync(cts.Token);
        using var reader = new StreamReader(stream);
        var firstLine = await reader.ReadLineAsync(cts.Token);
        Assert.Equal(": connected", firstLine);
    }

    [Fact]
    public async Task Connect_TicketIsSingleUse()
    {
        var client = await GetOrCreateAuthenticatedHttpClient();
        var ticket = await IssueTicket(client);

        using (var cts = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken))
        {
            cts.CancelAfter(TimeSpan.FromSeconds(10));
            using var firstConnect = await HttpClient.GetAsync(
                $"/api/events?ticket={ticket}", HttpCompletionOption.ResponseHeadersRead, cts.Token);
            Assert.Equal(HttpStatusCode.OK, firstConnect.StatusCode);
        }

        using var secondConnect = await HttpClient.GetAsync(
            $"/api/events?ticket={ticket}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, secondConnect.StatusCode);
    }

    private record TicketDto(string Ticket);
}
