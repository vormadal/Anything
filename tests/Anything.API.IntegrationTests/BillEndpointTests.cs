using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

public class BillEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private HttpClient? _authenticatedHttpClient;

    public BillEndpointTests(PostgresContainerFixture postgres) : base(postgres)
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

    // --- CRUD Lifecycle ---

    [Fact]
    public async Task CrudLifecycle_CreateReadUpdateDeleteWorkCorrectly()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        // Empty initially
        var emptyResponse = await client.GetAsync("/api/bills", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, emptyResponse.StatusCode);
        var emptyResult = await emptyResponse.Content.ReadFromJsonAsync<BillDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(emptyResult);
        Assert.Empty(emptyResult);

        // Create with None frequency
        var created = await CreateBillAsync("One-time expense", "None", false, isRecurring: false);
        Assert.True(created.Id > 0);
        Assert.Equal("One-time expense", created.Name);
        Assert.Equal("None", created.Frequency);

        // Create with Monthly frequency
        var monthly = await CreateBillAsync("Netflix", "Monthly", true);
        Assert.True(monthly.Id > 0);
        Assert.Equal("Monthly", monthly.Frequency);

        // List returns both
        var listResponse = await client.GetAsync("/api/bills", TestContext.Current.CancellationToken);
        var list = await listResponse.Content.ReadFromJsonAsync<BillDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(list);
        Assert.Equal(2, list.Length);

        // Get by ID
        var getResponse = await client.GetAsync($"/api/bills/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var fetched = await getResponse.Content.ReadFromJsonAsync<BillDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(fetched);
        Assert.Equal("One-time expense", fetched.Name);

        // Update
        var updatePayload = new
        {
            name = "Updated Expense",
            frequency = "None",
            isAutomated = false
        };
        var updateResponse = await client.PutAsJsonAsync($"/api/bills/{created.Id}", updatePayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        // Verify update
        var getAfterUpdate = await client.GetAsync($"/api/bills/{created.Id}", TestContext.Current.CancellationToken);
        var updatedBill = await getAfterUpdate.Content.ReadFromJsonAsync<BillDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal("Updated Expense", updatedBill?.Name);

        // Delete
        var deleteResponse = await client.DeleteAsync($"/api/bills/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify deleted
        var listAfterDelete = await client.GetAsync("/api/bills", TestContext.Current.CancellationToken);
        var remainingBills = await listAfterDelete.Content.ReadFromJsonAsync<BillDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(remainingBills);
        Assert.Single(remainingBills);
    }

    // --- Summary ---

    [Fact]
    public async Task Summary_ReturnsTotalMonthlyAndCurrentPeriod()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        // Create a monthly bill with a price entry for current month
        var bill = await CreateBillAsync("Rent", "Monthly", false);
        var now = DateTime.UtcNow;
        var pricePayload = new
        {
            amount = 500.00m,
            effectiveDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var priceResponse = await client.PostAsJsonAsync($"/api/bills/{bill.Id}/price-history", pricePayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, priceResponse.StatusCode);

        var summaryResponse = await client.GetAsync("/api/bills/summary", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, summaryResponse.StatusCode);
        var summary = await summaryResponse.Content.ReadFromJsonAsync<SummaryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(summary);
        Assert.Equal(1, summary.TotalBills);
        Assert.Equal(500m, summary.TotalMonthlyEquivalent);
        Assert.Equal(500m, summary.TotalCurrentMonthAmount);
        Assert.Equal(500m, summary.TotalCurrentYearAmount);
    }

    [Fact]
    public async Task Summary_NoneFrequencyBill_ExcludedFromMonthlyEquivalent()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        // Create a one-time bill
        var bill = await CreateBillAsync("One-time expense", "None", false, isRecurring: false);
        var now = DateTime.UtcNow;
        var pricePayload = new
        {
            amount = 1000m,
            effectiveDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        await client.PostAsJsonAsync($"/api/bills/{bill.Id}/price-history", pricePayload, TestContext.Current.CancellationToken);

        var summaryResponse = await client.GetAsync("/api/bills/summary", TestContext.Current.CancellationToken);
        var summary = await summaryResponse.Content.ReadFromJsonAsync<SummaryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(summary);

        // None frequency: monthly equivalent should be 0 (no recurring cost)
        Assert.Equal(0m, summary.TotalMonthlyEquivalent);
        // But current month/year shows the actual payment
        Assert.Equal(1000m, summary.TotalCurrentMonthAmount);
        Assert.Equal(1000m, summary.TotalCurrentYearAmount);
    }

    // --- Attachments ---

    [Fact]
    public async Task Attachments_UploadRenameDelete_WorkCorrectly()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var bill = await CreateBillAsync("Bill with attachments", "Monthly", true);

        // Upload a PDF attachment
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46 }); // %PDF magic bytes
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "invoice.pdf");

        var uploadResponse = await client.PostAsync($"/api/bills/{bill.Id}/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);

        // List attachments
        var listResponse = await client.GetAsync($"/api/bills/{bill.Id}/attachments", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var attachments = await listResponse.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(attachments);
        Assert.Single(attachments);
        Assert.Equal("invoice", attachments[0].Name); // Default name = file name without extension
        Assert.Equal("application/pdf", attachments[0].ContentType);
        Assert.Null(attachments[0].ThumbnailUrl); // PDF has no thumbnail

        // Rename attachment
        var renamePayload = new { name = "My Invoice" };
        var renameResponse = await client.PutAsJsonAsync($"/api/bills/{bill.Id}/attachments/{attachments[0].Id}", renamePayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, renameResponse.StatusCode);

        // Verify rename
        var listAfterRename = await client.GetAsync($"/api/bills/{bill.Id}/attachments", TestContext.Current.CancellationToken);
        var renamedAttachments = await listAfterRename.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.Equal("My Invoice", renamedAttachments![0].Name);

        // Delete attachment
        var deleteResponse = await client.DeleteAsync($"/api/bills/{bill.Id}/attachments/{attachments[0].Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify deleted
        var listAfterDelete = await client.GetAsync($"/api/bills/{bill.Id}/attachments", TestContext.Current.CancellationToken);
        var remaining = await listAfterDelete.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(remaining);
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task Attachments_UploadWithCustomName_UsesProvidedName()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var bill = await CreateBillAsync("Bill", "Monthly", true);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "random_filename.pdf");

        var uploadResponse = await client.PostAsync($"/api/bills/{bill.Id}/attachments?name=Custom+Name", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);

        var listResponse = await client.GetAsync($"/api/bills/{bill.Id}/attachments", TestContext.Current.CancellationToken);
        var attachments = await listResponse.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(attachments);
        Assert.Equal("Custom Name", attachments[0].Name);
    }

    [Fact]
    public async Task Attachments_ImageFile_HasThumbnailUrl()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var bill = await CreateBillAsync("Bill", "Monthly", true);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0xFF, 0xD8, 0xFF }); // JPEG magic bytes
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "receipt.jpg");

        await client.PostAsync($"/api/bills/{bill.Id}/attachments", content, TestContext.Current.CancellationToken);

        var listResponse = await client.GetAsync($"/api/bills/{bill.Id}/attachments", TestContext.Current.CancellationToken);
        var attachments = await listResponse.Content.ReadFromJsonAsync<AttachmentDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(attachments);
        Assert.Single(attachments);
        Assert.NotNull(attachments[0].ThumbnailUrl); // Image attachments have a thumbnail
    }

    [Fact]
    public async Task Attachments_NotFound_WhenBillDoesNotExist()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var listResponse = await client.GetAsync("/api/bills/99999/attachments", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, listResponse.StatusCode);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x01 });
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var uploadResponse = await client.PostAsync("/api/bills/99999/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, uploadResponse.StatusCode);
    }

    // --- Recurrence Invariant ---

    [Fact]
    public async Task Create_NotRecurring_ForcesFrequencyToNone()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var payload = new { name = "Gift", frequency = "Monthly", isAutomated = false, isRecurring = false };

        var response = await client.PostAsJsonAsync("/api/bills", payload, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var bill = await response.Content.ReadFromJsonAsync<BillDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(bill);
        Assert.Equal("None", bill.Frequency);
    }

    // --- Amount Entries ---

    [Fact]
    public async Task AmountEntries_AddAndList_WorksCorrectly()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var bill = await CreateBillAsync("Electric", "Monthly", false);

        var januaryPayload = new
        {
            amount = 45.50m,
            periodDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            notes = "January"
        };
        var januaryResponse = await client.PostAsJsonAsync($"/api/bills/{bill.Id}/amount-entries", januaryPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, januaryResponse.StatusCode);

        var februaryPayload = new
        {
            amount = 52.25m,
            periodDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            notes = "February"
        };
        var februaryResponse = await client.PostAsJsonAsync($"/api/bills/{bill.Id}/amount-entries", februaryPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, februaryResponse.StatusCode);
        var created = await februaryResponse.Content.ReadFromJsonAsync<AmountEntryDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(created);
        Assert.Equal(52.25m, created.Amount);
        Assert.Equal("February", created.Notes);

        var listResponse = await client.GetAsync($"/api/bills/{bill.Id}/amount-entries", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var entries = await listResponse.Content.ReadFromJsonAsync<AmountEntryDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(entries);
        Assert.Equal(2, entries.Length);
        // Ordered descending by PeriodDate
        Assert.Equal(52.25m, entries[0].Amount);
        Assert.Equal(45.50m, entries[1].Amount);
    }

    [Fact]
    public async Task AmountEntries_NotFound_WhenBillDoesNotExist()
    {
        var client = await GetAuthenticatedHttpClientAsync();

        var listResponse = await client.GetAsync("/api/bills/99999/amount-entries", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, listResponse.StatusCode);

        var addPayload = new { amount = 10m, periodDate = DateTime.UtcNow };
        var addResponse = await client.PostAsJsonAsync("/api/bills/99999/amount-entries", addPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, addResponse.StatusCode);
    }

    // --- Price History Date Ranges ---

    [Fact]
    public async Task PriceHistory_EndDate_PersistsAndReturns()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var bill = await CreateBillAsync("Insurance", "Annually", false);

        var pricePayload = new
        {
            amount = 500m,
            effectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            endDate = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc)
        };
        var addResponse = await client.PostAsJsonAsync($"/api/bills/{bill.Id}/price-history", pricePayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, addResponse.StatusCode);

        var listResponse = await client.GetAsync($"/api/bills/{bill.Id}/price-history", TestContext.Current.CancellationToken);
        var history = await listResponse.Content.ReadFromJsonAsync<PriceHistoryDto[]>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(history);
        Assert.Single(history);
        Assert.NotNull(history[0].EndDate);
    }

    [Fact]
    public async Task PriceHistory_OverlappingDateRange_ReturnsConflict()
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var bill = await CreateBillAsync("Insurance", "Annually", false);

        var firstPayload = new
        {
            amount = 500m,
            effectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            endDate = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc)
        };
        var firstResponse = await client.PostAsJsonAsync($"/api/bills/{bill.Id}/price-history", firstPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var overlappingPayload = new
        {
            amount = 550m,
            effectiveDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        var overlappingResponse = await client.PostAsJsonAsync($"/api/bills/{bill.Id}/price-history", overlappingPayload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Conflict, overlappingResponse.StatusCode);
    }

    // --- Helpers ---

    private async Task<BillDto> CreateBillAsync(string name, string frequency, bool isAutomated, bool isRecurring = true)
    {
        var client = await GetAuthenticatedHttpClientAsync();
        var payload = new { name, frequency, isAutomated, isRecurring };
        var response = await client.PostAsJsonAsync("/api/bills", payload, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<BillDto>(JsonOptions, TestContext.Current.CancellationToken);
        Assert.NotNull(result);
        return result;
    }

    private record BillDto(int Id, string? Name, string? Frequency, bool IsAutomated, decimal? CurrentAmount, decimal? MonthlyEquivalent);
    private record SummaryDto(int TotalBills, decimal TotalMonthlyEquivalent, int AutomatedCount, int ManualCount, decimal TotalCurrentMonthAmount, decimal TotalCurrentYearAmount);
    private record AttachmentDto(int Id, int BillId, string Name, string ContentType, string Url, string? ThumbnailUrl, DateTime CreatedOn);
    private record AmountEntryDto(int Id, int BillId, decimal Amount, DateTime PeriodDate, string? Notes, DateTime CreatedOn, DateTime? ModifiedOn);
    private record PriceHistoryDto(int Id, int BillId, decimal Amount, DateTime EffectiveDate, DateTime? EndDate, string? Notes, decimal? PreviousAmount, DateTime CreatedOn, DateTime? ModifiedOn);
}
