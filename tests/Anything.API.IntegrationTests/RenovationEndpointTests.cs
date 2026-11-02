using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Anything.API.IntegrationTests.Infrastructure;
using Xunit;

namespace Anything.API.IntegrationTests;

/// <summary>
/// Renovation projects against real Postgres — the loader's allocation/purchase join and the
/// nullable-FK material filter are the parts a mocked-repository unit test can't vouch for.
/// Calls go through plain HttpClient because the Kiota ApiClient here has no renovation builders yet.
/// </summary>
public class RenovationEndpointTests : IntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public RenovationEndpointTests(PostgresContainerFixture postgres) : base(postgres)
    {
    }

    private async Task<HttpClient> ClientAsync() => GetAuthenticatedHttpClient(await GetAdminTokenAsync());

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static async Task<T> Read<T>(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<T>(JsonOptions, Ct))!;

    private static async Task<(ProjectDto Project, RoomDto Kitchen)> CreateProjectWithKitchen(HttpClient client)
    {
        var projectResponse = await client.PostAsJsonAsync("/api/renovation-projects",
            new { name = $"Reno {Guid.NewGuid()}", budget = 200000m }, Ct);
        Assert.Equal(HttpStatusCode.Created, projectResponse.StatusCode);
        var project = await Read<ProjectDto>(projectResponse);

        var roomResponse = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/rooms", new
        {
            name = "Kitchen", roomType = "kitchen", length = 4.2m, width = 3.0m, height = 2.5m, doors = 1, windows = 1
        }, Ct);
        Assert.Equal(HttpStatusCode.Created, roomResponse.StatusCode);
        return (project, await Read<RoomDto>(roomResponse));
    }

    private static async Task<ProjectDto> GetProject(HttpClient client, int id) =>
        await Read<ProjectDto>(await client.GetAsync($"/api/renovation-projects/{id}", Ct));

    [Fact]
    public async Task GetRoomTemplates_IncludesKitchenAndBathroom()
    {
        var client = await ClientAsync();

        var templates = await Read<List<TemplateDto>>(await client.GetAsync("/api/renovation-room-templates", Ct));

        Assert.Contains(templates, t => t.RoomType == "kitchen");
        Assert.Contains(templates, t => t.RoomType == "bathroom" && t.Lines.Any(l => l.Basis == "FloorAndWall"));
    }

    [Fact]
    public async Task CreateRoom_FromKitchenTemplate_EstimatesFromRoomSize()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);

        Assert.Equal(11, kitchen.Lines.Count);
        Assert.Equal(12.6m, kitchen.FloorArea);
        Assert.Equal(32.61m, kitchen.WallArea);
        Assert.Equal(102183.94m, kitchen.Estimate);

        var loaded = await GetProject(client, project.Id);
        Assert.Equal(102183.94m, loaded.Estimate);
        Assert.Equal(loaded.Estimate, loaded.Forecast);
        Assert.Equal(0m, loaded.Actual);

        var materials = await Read<List<MaterialDto>>(await client.GetAsync("/api/renovation-materials", Ct));
        Assert.Contains(materials, m => m.Name == "Oak laminate 8 mm" && m.DefaultPrice == 289m);
    }

    [Fact]
    public async Task ResizeRoom_RepricesAreaLines()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);

        var response = await client.PutAsJsonAsync($"/api/renovation-projects/{project.Id}/rooms/{kitchen.Id}", new
        {
            name = "Kitchen", length = 5.0m, width = 3.0m, height = 2.5m, doors = 1, windows = 1
        }, Ct);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var floor = (await GetProject(client, project.Id)).Rooms.Single().Lines.Single(l => l.Label == "Floor");
        Assert.Equal(16.5m, floor.RequiredQuantity); // 15 m² + 10% waste
    }

    [Fact]
    public async Task PartialPurchase_SplitsTotal_AndForecastsTheRest()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);
        var floor = kitchen.Lines.Single(l => l.Label == "Floor");
        var skirting = kitchen.Lines.Single(l => l.Label == "Skirting");

        var purchaseResponse = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/purchases", new
        {
            vendor = "Store",
            purchasedOn = "2026-11-01",
            totalAmount = 3000m,
            lines = new object[]
            {
                new { lineId = floor.Id, quantity = 6m },
                new { lineId = skirting.Id, quantity = skirting.RequiredQuantity },
            }
        }, Ct);
        Assert.Equal(HttpStatusCode.Created, purchaseResponse.StatusCode);
        var purchase = await Read<PurchaseDto>(purchaseResponse);
        Assert.Equal(3000m, purchase.Lines.Sum(l => l.Amount));
        var floorWeight = 6m * 289m;
        var skirtingWeight = skirting.RequiredQuantity * 59m;
        Assert.Equal(Math.Round(3000m * floorWeight / (floorWeight + skirtingWeight), 2), purchase.Lines[0].Amount);

        var loaded = await GetProject(client, project.Id);
        var lines = loaded.Rooms.Single().Lines;
        var floorAfter = lines.Single(l => l.Id == floor.Id);
        var skirtingAfter = lines.Single(l => l.Id == skirting.Id);
        Assert.Equal("Partial", floorAfter.Status);
        Assert.Equal(7.86m, floorAfter.RemainingQuantity);
        Assert.Equal(purchase.Lines[0].Amount + 7.86m * 289m, floorAfter.Forecast);
        Assert.Equal("Complete", skirtingAfter.Status);
        Assert.Equal(purchase.Lines[1].Amount, skirtingAfter.Forecast);
        Assert.Equal(3000m, loaded.Actual);

        var purchases = await Read<List<PurchaseDto>>(await client.GetAsync($"/api/renovation-projects/{project.Id}/purchases", Ct));
        var listed = Assert.Single(purchases);
        Assert.Equal("Kitchen", listed.Lines[0].RoomName);

        var delete = await client.DeleteAsync($"/api/renovation-projects/{project.Id}/purchases/{purchase.Id}", Ct);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        var afterDelete = await GetProject(client, project.Id);
        Assert.Equal(0m, afterDelete.Actual);
        Assert.Equal(afterDelete.Estimate, afterDelete.Forecast);
    }

    [Fact]
    public async Task PurchaseReceipt_UploadListDownloadDelete_CountsOnThePurchase()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);
        var floor = kitchen.Lines.Single(l => l.Label == "Floor");
        var purchaseResponse = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/purchases", new
        {
            vendor = "Store",
            purchasedOn = "2026-11-01",
            totalAmount = 500m,
            lines = new object[] { new { lineId = floor.Id, quantity = 1m } }
        }, Ct);
        Assert.Equal(HttpStatusCode.Created, purchaseResponse.StatusCode);
        var purchase = await Read<PurchaseDto>(purchaseResponse);
        Assert.Equal(0, purchase.AttachmentCount);
        var attachmentsUrl = $"/api/renovation-projects/{project.Id}/purchases/{purchase.Id}/attachments";

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46 }); // %PDF magic bytes
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "receipt.pdf");
        var upload = await client.PostAsync(attachmentsUrl, content, Ct);
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);

        var listed = await Read<List<PurchaseAttachmentDto>>(await client.GetAsync(attachmentsUrl, Ct));
        var attachment = Assert.Single(listed);
        Assert.Equal("receipt", attachment.Name);
        Assert.Equal(4L, attachment.Size);

        var purchases = await Read<List<PurchaseDto>>(await client.GetAsync($"/api/renovation-projects/{project.Id}/purchases", Ct));
        Assert.Equal(1, Assert.Single(purchases).AttachmentCount);

        var download = await client.GetAsync($"{attachmentsUrl}/{attachment.Id}/download", Ct);
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);

        var delete = await client.DeleteAsync($"{attachmentsUrl}/{attachment.Id}", Ct);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Empty(await Read<List<PurchaseAttachmentDto>>(await client.GetAsync(attachmentsUrl, Ct)));
    }

    [Fact]
    public async Task Purchase_WithLineFromAnotherProject_IsRejected()
    {
        var client = await ClientAsync();
        var (projectA, _) = await CreateProjectWithKitchen(client);
        var (_, kitchenB) = await CreateProjectWithKitchen(client);

        var response = await client.PostAsJsonAsync($"/api/renovation-projects/{projectA.Id}/purchases", new
        {
            purchasedOn = "2026-11-01",
            totalAmount = 100m,
            lines = new[] { new { lineId = kitchenB.Lines[0].Id, quantity = 1m } }
        }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PurchaseFromVendor_AddsLineToInventoryOnce()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);
        var appliances = kitchen.Lines.Single(l => l.Label == "Appliances");

        var vendorResponse = await client.PostAsJsonAsync("/api/vendors", new { name = $"Appliance store {Guid.NewGuid()}" }, Ct);
        Assert.Equal(HttpStatusCode.Created, vendorResponse.StatusCode);
        var vendor = await Read<VendorDto>(vendorResponse);

        var purchaseResponse = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/purchases", new
        {
            vendorId = vendor.Id,
            purchasedOn = "2026-11-01",
            totalAmount = 24000m,
            lines = new[] { new { lineId = appliances.Id, quantity = 1m } }
        }, Ct);
        Assert.Equal(HttpStatusCode.Created, purchaseResponse.StatusCode);
        var purchase = await Read<PurchaseDto>(purchaseResponse);
        Assert.Equal(vendor.Id, purchase.VendorId);
        Assert.Equal(vendor.Name, purchase.Vendor);

        var listed = Assert.Single(await Read<List<PurchaseDto>>(
            await client.GetAsync($"/api/renovation-projects/{project.Id}/purchases", Ct)));
        Assert.Equal(vendor.Id, listed.VendorId);
        Assert.Equal(vendor.Name, listed.Vendor);
        var allocation = listed.Lines.Single();
        Assert.Null(allocation.InventoryItemId);

        var url = $"/api/renovation-projects/{project.Id}/purchases/{purchase.Id}/lines/{appliances.Id}/inventory-item";
        var add = await client.PostAsJsonAsync(url, new { brand = "Bosch" }, Ct);
        Assert.Equal(HttpStatusCode.Created, add.StatusCode);
        var item = await Read<InventoryItemDto>(add);
        Assert.Equal("Oven, hob, fridge, dishwasher", item.Name);
        Assert.Equal(1, item.Quantity);
        Assert.Equal(allocation.Amount, item.PurchasePrice);

        var fetched = await Read<InventoryItemDto>(await client.GetAsync($"/api/inventory-items/{item.Id}", Ct));
        Assert.Equal("Oven, hob, fridge, dishwasher", fetched.Name);
        Assert.Equal(allocation.Amount, fetched.PurchasePrice);

        var afterAdd = Assert.Single(await Read<List<PurchaseDto>>(
            await client.GetAsync($"/api/renovation-projects/{project.Id}/purchases", Ct)));
        Assert.Equal(item.Id, afterAdd.Lines.Single().InventoryItemId);

        var again = await client.PostAsJsonAsync(url, new { brand = "Bosch" }, Ct);
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
    }

    [Fact]
    public async Task ReplaceMaterial_UpdatesUnpurchasedLinesOnly()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);
        var floor = kitchen.Lines.Single(l => l.Label == "Floor");

        var bedroomResponse = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/rooms", new
        {
            name = "Bedroom", roomType = "bedroom", length = 3.6m, width = 3.2m, height = 2.5m, doors = 1, windows = 1
        }, Ct);
        var bedroom = await Read<RoomDto>(bedroomResponse);

        await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/purchases", new
        {
            purchasedOn = "2026-11-01",
            totalAmount = 4000m,
            lines = new[] { new { lineId = floor.Id, quantity = floor.RequiredQuantity } }
        }, Ct);

        var materialResponse = await client.PostAsJsonAsync("/api/renovation-materials", new
        {
            name = $"Vinyl {Guid.NewGuid()}", category = "Flooring", unit = "m²", defaultPrice = 249m, wastePercent = 5m,
            productUrl = "https://example.com/vinyl"
        }, Ct);
        Assert.Equal(HttpStatusCode.Created, materialResponse.StatusCode);
        var vinyl = await Read<MaterialDto>(materialResponse);

        var replace = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/lines/replace-material",
            new { fromMaterialId = floor.MaterialId, toMaterialId = vinyl.Id }, Ct);
        Assert.Equal(HttpStatusCode.OK, replace.StatusCode);
        var result = await Read<ReplaceDto>(replace);
        Assert.Equal(1, result.UpdatedLines);
        Assert.Equal(1, result.SkippedPurchasedLines);

        var loaded = await GetProject(client, project.Id);
        var bedroomFloor = loaded.Rooms.Single(r => r.Id == bedroom.Id).Lines.Single(l => l.Label == "Floor");
        Assert.Equal(vinyl.Id, bedroomFloor.MaterialId);
        Assert.Equal(249m, bedroomFloor.UnitPrice);
        var kitchenFloor = loaded.Rooms.Single(r => r.Id == kitchen.Id).Lines.Single(l => l.Label == "Floor");
        Assert.Equal(289m, kitchenFloor.UnitPrice);
    }

    [Fact]
    public async Task DeleteRoom_WithPurchases_ReturnsConflict()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);
        await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/purchases", new
        {
            purchasedOn = "2026-11-01",
            totalAmount = 100m,
            lines = new[] { new { lineId = kitchen.Lines[0].Id, quantity = 1m } }
        }, Ct);

        var response = await client.DeleteAsync($"/api/renovation-projects/{project.Id}/rooms/{kitchen.Id}", Ct);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task UpdateLine_SwapsMaterialAndPrice()
    {
        var client = await ClientAsync();
        var (project, kitchen) = await CreateProjectWithKitchen(client);
        var floor = kitchen.Lines.Single(l => l.Label == "Floor");

        var response = await client.PutAsJsonAsync($"/api/renovation-projects/{project.Id}/lines/{floor.Id}", new
        {
            label = "Floor", group = "Surfaces", materialId = (int?)null, description = "Engineered oak 14 mm",
            basis = "Floor", unit = "m²", unitPrice = 549m, wastePercent = 10m
        }, Ct);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var updated = (await GetProject(client, project.Id)).Rooms.Single().Lines.Single(l => l.Id == floor.Id);
        Assert.Equal("Engineered oak 14 mm", updated.Description);
        Assert.Equal(Math.Round(13.86m * 549m, 2), updated.Estimate);
    }

    [Fact]
    public async Task CreateMaterial_WithScriptUrl_IsRejected()
    {
        var client = await ClientAsync();

        var response = await client.PostAsJsonAsync("/api/renovation-materials", new
        {
            name = "Bad", category = "Other", unit = "pcs", defaultPrice = 1m, wastePercent = 0m,
            productUrl = "javascript:alert(1)"
        }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Project_IsInvisibleToAnotherHousehold()
    {
        var token = await GetAdminTokenAsync();
        var client = GetAuthenticatedHttpClient(token);
        var (project, _) = await CreateProjectWithKitchen(client);

        var plain = Factory.CreateClient();
        plain.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        var household = await Read<IdDto>(await plain.PostAsJsonAsync("/api/households", new { name = "Other" }, Ct));
        var otherClient = GetAuthenticatedHttpClient(token, household.Id);

        var response = await otherClient.GetAsync($"/api/renovation-projects/{project.Id}", Ct);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var list = await Read<List<IdDto>>(await otherClient.GetAsync("/api/renovation-projects", Ct));
        Assert.DoesNotContain(list, p => p.Id == project.Id);
    }

    [Fact]
    public async Task CustomisedBathroom_SeedsNewRooms_AndResetsOnDelete()
    {
        var client = await ClientAsync();
        var (project, _) = await CreateProjectWithKitchen(client);
        var templatesUrl = "/api/renovation-room-templates";
        var defaults = await Read<List<TemplateDto>>(await client.GetAsync(templatesUrl, Ct));
        var defaultBathroom = defaults.Single(t => t.RoomType == "bathroom");
        Assert.False(defaultBathroom.IsCustomised);

        // Every built-in bathroom line except the floor heating, with the floor tiles dearer.
        var lines = defaultBathroom.Lines
            .Where(l => l.Key != "heating")
            .Select(l => new
            {
                key = l.Key, label = l.Label, group = l.Group, materialName = l.MaterialName, category = l.Category,
                basis = l.Basis, unit = l.Unit, defaultPrice = l.Key == "floor" ? 600m : l.DefaultPrice,
                wastePercent = l.WastePercent, fixedQuantity = l.FixedQuantity, enabledByDefault = l.EnabledByDefault
            })
            .ToList();
        var save = await client.PutAsJsonAsync($"{templatesUrl}/bathroom", new
        {
            label = "Wet room", length = 2.4m, width = 1.8m, height = 2.4m, doors = 1, windows = 0, lines
        }, Ct);
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        var saved = await Read<TemplateDto>(save);
        Assert.True(saved.IsCustomised);
        Assert.True(saved.IsBuiltIn);

        var listed = (await Read<List<TemplateDto>>(await client.GetAsync(templatesUrl, Ct))).Single(t => t.RoomType == "bathroom");
        Assert.True(listed.IsCustomised);
        Assert.Equal("Wet room", listed.Label);
        Assert.DoesNotContain(listed.Lines, l => l.Key == "heating");
        Assert.Equal(600m, listed.Lines.Single(l => l.Key == "floor").DefaultPrice);

        var roomResponse = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/rooms", new
        {
            name = "Bathroom", roomType = "bathroom", length = 2.4m, width = 1.8m, height = 2.4m, doors = 1, windows = 0
        }, Ct);
        Assert.Equal(HttpStatusCode.Created, roomResponse.StatusCode);
        var room = await Read<RoomDto>(roomResponse);
        Assert.Equal(10, room.Lines.Count);
        Assert.DoesNotContain(room.Lines, l => l.Label == "Floor heating");
        Assert.Equal(600m, room.Lines.Single(l => l.Label == "Floor").UnitPrice);

        var reset = await client.DeleteAsync($"{templatesUrl}/bathroom", Ct);
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        var afterReset = (await Read<List<TemplateDto>>(await client.GetAsync(templatesUrl, Ct))).Single(t => t.RoomType == "bathroom");
        Assert.False(afterReset.IsCustomised);
        Assert.True(afterReset.IsBuiltIn);
        Assert.Equal(defaultBathroom.Lines.Count, afterReset.Lines.Count);
        Assert.Equal(defaultBathroom.Lines.Single(l => l.Key == "floor").DefaultPrice,
            afterReset.Lines.Single(l => l.Key == "floor").DefaultPrice);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"{templatesUrl}/bathroom", Ct)).StatusCode);
    }

    [Fact]
    public async Task HouseholdRoomType_IsListedLast_SeedsRooms_AndCanBeDeleted()
    {
        var client = await ClientAsync();
        var (project, _) = await CreateProjectWithKitchen(client);
        var templatesUrl = "/api/renovation-room-templates";
        var key = $"garage-{Guid.NewGuid():N}";

        var save = await client.PutAsJsonAsync($"{templatesUrl}/{key}", new
        {
            label = "Garage", length = 6m, width = 3m, height = 2.5m, doors = 1, windows = 0,
            lines = new[]
            {
                new
                {
                    key = "floor", label = "Floor", group = "Surfaces", materialName = $"Concrete sealer {Guid.NewGuid():N}",
                    category = "Floor", basis = "Floor", unit = "m²", defaultPrice = 40m, wastePercent = 5m
                }
            }
        }, Ct);
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        var saved = await Read<TemplateDto>(save);
        Assert.False(saved.IsBuiltIn);
        Assert.False(saved.IsCustomised);

        var listed = await Read<List<TemplateDto>>(await client.GetAsync(templatesUrl, Ct));
        Assert.Equal(key, listed.Last().RoomType);

        var roomResponse = await client.PostAsJsonAsync($"/api/renovation-projects/{project.Id}/rooms", new
        {
            name = "Garage", roomType = key, length = 6m, width = 3m, height = 2.5m, doors = 1, windows = 0
        }, Ct);
        Assert.Equal(HttpStatusCode.Created, roomResponse.StatusCode);
        var room = await Read<RoomDto>(roomResponse);
        var floor = Assert.Single(room.Lines);
        Assert.Equal(40m, floor.UnitPrice);
        Assert.Equal(18m, room.FloorArea);

        var delete = await client.DeleteAsync($"{templatesUrl}/{key}", Ct);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.DoesNotContain(await Read<List<TemplateDto>>(await client.GetAsync(templatesUrl, Ct)), t => t.RoomType == key);
    }

    [Fact]
    public async Task SaveRoomTemplate_WithInvalidRoomType_IsBadRequest()
    {
        var client = await ClientAsync();

        var response = await client.PutAsJsonAsync("/api/renovation-room-templates/Not_Valid", new
        {
            label = "Bad", length = 2m, width = 2m, height = 2.5m, doors = 0, windows = 0, lines = Array.Empty<object>()
        }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SaveRoomTemplate_AsHouseholdMember_IsForbidden()
    {
        var memberClient = await CreateHouseholdMemberClientAsync(DefaultHouseholdId);
        var templatesUrl = "/api/renovation-room-templates/bathroom";

        var save = await memberClient.PutAsJsonAsync(templatesUrl, new
        {
            label = "Mine", length = 2m, width = 2m, height = 2.5m, doors = 0, windows = 0, lines = Array.Empty<object>()
        }, Ct);
        var delete = await memberClient.DeleteAsync(templatesUrl, Ct);

        Assert.Equal(HttpStatusCode.Forbidden, save.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, delete.StatusCode);
    }

    [Fact]
    public async Task GetProjects_RequiresAuthentication()
    {
        var response = await HttpClient.GetAsync("/api/renovation-projects", Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private record IdDto(int Id);
    private record VendorDto(int Id, string Name);
    private record InventoryItemDto(int Id, string Name, int? Quantity, decimal? PurchasePrice);
    private record ProjectDto(int Id, string Name, decimal? Budget, decimal Estimate, decimal Actual, decimal Forecast, List<RoomDto> Rooms);
    private record RoomDto(int Id, string Name, decimal FloorArea, decimal WallArea, decimal Estimate, decimal Forecast, List<LineDto> Lines);
    private record LineDto(int Id, string Label, int? MaterialId, string Description, decimal UnitPrice,
        decimal RequiredQuantity, decimal RemainingQuantity, decimal Estimate, decimal Forecast, string Status);
    private record MaterialDto(int Id, string Name, decimal DefaultPrice);
    private record PurchaseDto(int Id, int? VendorId, string? Vendor, List<PurchaseLineDto> Lines, int AttachmentCount);
    private record PurchaseAttachmentDto(int Id, int PurchaseId, string Name, string ContentType, long Size, string Url, string? ThumbnailUrl);
    private record PurchaseLineDto(int LineId, string RoomName, decimal Quantity, decimal Amount, int? InventoryItemId);
    private record ReplaceDto(int UpdatedLines, int SkippedPurchasedLines);
    private record TemplateDto(string RoomType, string Label, List<TemplateLineDto> Lines, bool IsCustomised, bool IsBuiltIn);
    private record TemplateLineDto(string Key, string Label, string Group, string MaterialName, string Category,
        string Basis, string Unit, decimal DefaultPrice, decimal WastePercent, decimal? FixedQuantity, bool EnabledByDefault);
}
