using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class NotificationEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _adminClient;

    public NotificationEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    /// <summary>The admin, who owns <see cref="IntegrationTestBase.DefaultHouseholdId"/>.</summary>
    private async Task<HttpClient> AdminClient()
    {
        _adminClient ??= GetAuthenticatedHttpClient(await GetAdminTokenAsync());
        return _adminClient;
    }

    /// <summary>
    /// Registers a second user, adds them to the default household and returns a
    /// client authenticated as them. Notifications fan out per recipient, so most
    /// of what matters here needs two members.
    /// </summary>
    private async Task<(int UserId, HttpClient Client)> AddMember(string email, string role = "Member")
    {
        var admin = await AdminClient();

        var inviteResponse = await admin.PostAsJsonAsync(
            "/api/auth/invites", new { email }, TestContext.Current.CancellationToken);
        inviteResponse.EnsureSuccessStatusCode();
        var invite = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>(JsonOptions, TestContext.Current.CancellationToken);

        var registerResponse = await HttpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "User123!",
            name = email.Split('@')[0],
            inviteToken = invite!.Token
        }, TestContext.Current.CancellationToken);
        registerResponse.EnsureSuccessStatusCode();
        var registered = await registerResponse.Content.ReadFromJsonAsync<RegisterResponse>(JsonOptions, TestContext.Current.CancellationToken);

        var addResponse = await admin.PostAsJsonAsync(
            $"/api/households/{DefaultHouseholdId}/members",
            new { userId = registered!.Id, role },
            TestContext.Current.CancellationToken);
        addResponse.EnsureSuccessStatusCode();

        var loginResponse = await HttpClient.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "User123!"
        }, TestContext.Current.CancellationToken);
        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions, TestContext.Current.CancellationToken);

        return (registered.Id, GetAuthenticatedHttpClient(login!.AccessToken));
    }

    private static async Task<List<NotificationDto>> GetNotifications(HttpClient client, string query = "")
    {
        var response = await client.GetAsync($"/api/notifications{query}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<List<NotificationDto>>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private static async Task<int> GetUnreadCount(HttpClient client)
    {
        var response = await client.GetAsync("/api/notifications/unread-count", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<UnreadCountDto>(JsonOptions, TestContext.Current.CancellationToken);
        return result!.Count;
    }

    private static Task<HttpResponseMessage> Send(HttpClient client, string title, string? body = null, bool includeSelf = false) =>
        client.PostAsJsonAsync("/api/notifications",
            new { title, body, includeSelf },
            TestContext.Current.CancellationToken);

    // --- auth ---

    [Fact]
    public async Task GetNotifications_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/notifications", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SendNotification_ByPlainMember_Returns403()
    {
        var (_, memberClient) = await AddMember("plain-member@test.com");

        var response = await Send(memberClient, "Not allowed");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // --- send + inbox ---

    [Fact]
    public async Task SendNotification_ReachesOtherMembersButNotTheSender()
    {
        var (_, memberClient) = await AddMember("recipient@test.com");
        var admin = await AdminClient();

        var response = await Send(admin, "Bin day moved", "Thursday this week.");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var sent = await response.Content.ReadFromJsonAsync<SendResultDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal(1, sent!.Recipients);

        var received = await GetNotifications(memberClient);
        var announcement = Assert.Single(received, n => n.Category == "announcement");
        Assert.Equal("Bin day moved", announcement.Title);
        Assert.Equal("Thursday this week.", announcement.Body);
        Assert.Null(announcement.ReadOn);

        Assert.DoesNotContain(await GetNotifications(admin), n => n.Category == "announcement");
    }

    [Fact]
    public async Task SendNotification_WithIncludeSelf_AlsoReachesTheSender()
    {
        await AddMember("other@test.com");
        var admin = await AdminClient();

        var response = await Send(admin, "Everyone including me", includeSelf: true);

        var sent = await response.Content.ReadFromJsonAsync<SendResultDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal(2, sent!.Recipients);
        Assert.Contains(await GetNotifications(admin), n => n.Title == "Everyone including me");
    }

    [Fact]
    public async Task SendNotification_WithEmptyTitle_Returns400()
    {
        var admin = await AdminClient();

        var response = await Send(admin, "");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddingAMember_NotifiesTheExistingMembersOnly()
    {
        var (_, firstClient) = await AddMember("first@test.com");
        var (_, secondClient) = await AddMember("second@test.com");
        var admin = await AdminClient();

        // The admin and the first member were already in the household when the
        // second joined; the second member gets nothing about their own arrival.
        var adminInbox = await GetNotifications(admin);
        Assert.Contains(adminInbox, n => n.Category == "householdmember" && n.Title.Contains("second"));

        var firstInbox = await GetNotifications(firstClient);
        Assert.Contains(firstInbox, n => n.Category == "householdmember" && n.Title.Contains("second"));
        Assert.DoesNotContain(firstInbox, n => n.Title.Contains("first"));

        Assert.Empty(await GetNotifications(secondClient));
    }

    [Fact]
    public async Task MemberNotification_LinksToTheHousehold()
    {
        await AddMember("linked@test.com");
        var admin = await AdminClient();

        var notification = Assert.Single(await GetNotifications(admin), n => n.Category == "householdmember");
        Assert.Equal($"/households/{DefaultHouseholdId}", notification.LinkUrl);
    }

    // --- read state ---

    [Fact]
    public async Task UnreadCount_TracksMarkingReadAndMarkingAllRead()
    {
        var (_, memberClient) = await AddMember("reader@test.com");
        var admin = await AdminClient();
        await Send(admin, "First");
        await Send(admin, "Second");

        Assert.Equal(2, await GetUnreadCount(memberClient));

        var first = (await GetNotifications(memberClient)).First();
        var markResponse = await memberClient.PutAsync(
            $"/api/notifications/{first.Id}/read", null, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, markResponse.StatusCode);
        Assert.Equal(1, await GetUnreadCount(memberClient));

        var markAllResponse = await memberClient.PutAsync(
            "/api/notifications/read-all", null, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, markAllResponse.StatusCode);
        Assert.Equal(0, await GetUnreadCount(memberClient));
        Assert.All(await GetNotifications(memberClient), n => Assert.NotNull(n.ReadOn));
    }

    [Fact]
    public async Task UnreadOnly_FiltersOutReadNotifications()
    {
        var (_, memberClient) = await AddMember("filter@test.com");
        var admin = await AdminClient();
        await Send(admin, "Stays unread");

        var toRead = (await GetNotifications(memberClient)).First();
        await memberClient.PutAsync($"/api/notifications/{toRead.Id}/read", null, TestContext.Current.CancellationToken);

        var unread = await GetNotifications(memberClient, "?unreadOnly=true");
        Assert.DoesNotContain(unread, n => n.Id == toRead.Id);
    }

    [Fact]
    public async Task Limit_CapsTheReturnedPage()
    {
        var (_, memberClient) = await AddMember("limited@test.com");
        var admin = await AdminClient();
        await Send(admin, "One");
        await Send(admin, "Two");
        await Send(admin, "Three");

        Assert.Equal(2, (await GetNotifications(memberClient, "?limit=2")).Count);
    }

    [Fact]
    public async Task MarkRead_ForAnotherMembersNotification_Returns404()
    {
        var (_, memberClient) = await AddMember("owner-of-it@test.com");
        var (_, otherClient) = await AddMember("not-theirs@test.com");
        var admin = await AdminClient();
        await Send(admin, "Only one of you may touch this");

        // Both members received a copy; the ids are distinct rows, so one
        // member's id must be invisible to the other.
        var targetId = (await GetNotifications(memberClient))
            .Single(n => n.Title == "Only one of you may touch this").Id;

        var response = await otherClient.PutAsync(
            $"/api/notifications/{targetId}/read", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- delete ---

    [Fact]
    public async Task Delete_RemovesItFromTheInbox()
    {
        var (_, memberClient) = await AddMember("deleter@test.com");
        var admin = await AdminClient();
        await Send(admin, "Dismiss me");

        var target = (await GetNotifications(memberClient)).Single(n => n.Title == "Dismiss me");
        var response = await memberClient.DeleteAsync(
            $"/api/notifications/{target.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.DoesNotContain(await GetNotifications(memberClient), n => n.Id == target.Id);
    }

    [Fact]
    public async Task Delete_UnknownId_Returns404()
    {
        var admin = await AdminClient();

        var response = await admin.DeleteAsync("/api/notifications/999999", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // --- preferences ---

    [Fact]
    public async Task GetPreferences_WhenNoneSaved_ReturnsEveryCategoryEnabledInOrder()
    {
        var admin = await AdminClient();

        var response = await admin.GetAsync("/api/notifications/preferences", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<List<PreferenceDto>>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        // Mirrors NotificationCategories.All — adding a category means updating this.
        Assert.Equal(["announcement", "householdmember"], result.Select(p => p.Category).ToList());
        Assert.All(result, p => Assert.True(p.InAppEnabled));
    }

    [Fact]
    public async Task UpdatePreferences_WithUnknownCategory_Returns400()
    {
        var admin = await AdminClient();

        var response = await admin.PutAsJsonAsync("/api/notifications/preferences", new
        {
            preferences = new[] { new { category = "not-a-category", inAppEnabled = false } }
        }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task OptingOut_StopsTheCategoryFromArriving()
    {
        var (_, memberClient) = await AddMember("opted-out@test.com");
        var admin = await AdminClient();

        var update = await memberClient.PutAsJsonAsync("/api/notifications/preferences", new
        {
            preferences = new[] { new { category = "announcement", inAppEnabled = false } }
        }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, update.StatusCode);

        var sendResponse = await Send(admin, "Should not arrive");
        var sent = await sendResponse.Content.ReadFromJsonAsync<SendResultDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal(0, sent!.Recipients);
        Assert.DoesNotContain(await GetNotifications(memberClient), n => n.Title == "Should not arrive");
    }

    [Fact]
    public async Task OptingOut_LeavesOtherCategoriesAlone()
    {
        var (_, memberClient) = await AddMember("partial-opt-out@test.com");

        await memberClient.PutAsJsonAsync("/api/notifications/preferences", new
        {
            preferences = new[] { new { category = "announcement", inAppEnabled = false } }
        }, TestContext.Current.CancellationToken);

        await AddMember("arrives-anyway@test.com");

        Assert.Contains(await GetNotifications(memberClient), n => n.Category == "householdmember");
    }

    [Fact]
    public async Task UpdatePreferences_RoundTrips()
    {
        var admin = await AdminClient();

        await admin.PutAsJsonAsync("/api/notifications/preferences", new
        {
            preferences = new[]
            {
                new { category = "announcement", inAppEnabled = false },
                new { category = "householdmember", inAppEnabled = true }
            }
        }, TestContext.Current.CancellationToken);

        var response = await admin.GetAsync("/api/notifications/preferences", TestContext.Current.CancellationToken);
        var result = await response.Content.ReadFromJsonAsync<List<PreferenceDto>>(JsonOptions, TestContext.Current.CancellationToken);

        Assert.False(result!.Single(p => p.Category == "announcement").InAppEnabled);
        Assert.True(result.Single(p => p.Category == "householdmember").InAppEnabled);
    }

    // --- local DTOs ---

    private record NotificationDto(
        int Id, string Category, string Title, string? Body, string? LinkUrl, DateTime CreatedOn, DateTime? ReadOn);
    private record UnreadCountDto(int Count);
    private record SendResultDto(int Recipients);
    private record PreferenceDto(string Category, bool InAppEnabled);
    private record LoginResponse(string AccessToken, string RefreshToken, string Email, string Name, string Role);
    private record InviteResponse(string Token);
    private record RegisterResponse(int Id, string Email, string Name);
}
