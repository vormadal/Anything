using Anything.Application.Features.Renovation;
using Anything.Application.Features.Renovation.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Inventory;
using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Renovation;

/// <summary>In-memory stand-ins for the renovation repositories (plus vendors); Add/AddRange append to the lists.</summary>
internal sealed class RenovationFakes
{
    public const int HouseholdId = 1;
    public List<RenovationProject> Projects { get; } = [];
    public List<RenovationRoom> Rooms { get; } = [];
    public List<RenovationLine> Lines { get; } = [];
    public List<RenovationMaterial> Materials { get; } = [];
    public List<RenovationPurchase> Purchases { get; } = [];
    public List<RenovationPurchaseAllocation> Allocations { get; } = [];
    public List<Vendor> Vendors { get; } = [];

    public IHouseholdContext HouseholdContext { get; } = Substitute.For<IHouseholdContext>();
    public IUnitOfWork UnitOfWork { get; } = Substitute.For<IUnitOfWork>();
    public TimeProvider TimeProvider { get; } = Substitute.For<TimeProvider>();

    public RenovationFakes()
    {
        HouseholdContext.HouseholdId.Returns(HouseholdId);
        TimeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 11, 1, 12, 0, 0, TimeSpan.Zero));
    }

    public RenovationRepositories Repos() => new(
        Repo(Projects), Repo(Rooms), Repo(Lines), Repo(Materials), Repo(Purchases), Repo(Allocations), Repo(Vendors));

    private static IRepository<T> Repo<T>(List<T> items) where T : class
    {
        var repo = Substitute.For<IRepository<T>>();
        repo.Query().Returns(_ => items.AsAsyncQueryable());
        repo.When(r => r.Add(Arg.Any<T>())).Do(c => items.Add(c.Arg<T>()));
        repo.When(r => r.AddRange(Arg.Any<IEnumerable<T>>())).Do(c => items.AddRange(c.Arg<IEnumerable<T>>()));
        return repo;
    }

    public (RenovationRoom Room, RenovationLine Floor, RenovationLine Skirting) SeedKitchen()
    {
        Projects.Add(new RenovationProject { Id = 10, HouseholdId = HouseholdId, Name = "Ground floor" });
        var room = new RenovationRoom
        {
            Id = 20, HouseholdId = HouseholdId, ProjectId = 10, Name = "Kitchen", RoomType = "kitchen",
            Length = 4.2m, Width = 3.0m, Height = 2.5m, Doors = 1, Windows = 1
        };
        var floor = new RenovationLine
        {
            Id = 30, HouseholdId = HouseholdId, RoomId = 20, Label = "Floor", Description = "Oak laminate 8 mm",
            Basis = RenovationQuantityBasis.Floor, Unit = "m²", UnitPrice = 289m, WastePercent = 10m
        };
        var skirting = new RenovationLine
        {
            Id = 31, HouseholdId = HouseholdId, RoomId = 20, Label = "Skirting", Description = "Oak skirting 12×58",
            Basis = RenovationQuantityBasis.Perimeter, Unit = "m", UnitPrice = 59m, WastePercent = 10m
        };
        Rooms.Add(room);
        Lines.AddRange([floor, skirting]);
        return (room, floor, skirting);
    }
}

public class CreateRenovationPurchaseHandlerTests
{
    private readonly RenovationFakes _f = new();

    private CreateRenovationPurchaseHandler Handler() =>
        new(_f.Repos(), _f.HouseholdContext, _f.UnitOfWork, _f.TimeProvider);

    [Fact]
    public async Task Handle_SplitsTotalByEstimateShareOfQuantityBought()
    {
        _f.SeedKitchen();
        var request = new CreateRenovationPurchaseRequest("Store", null, new DateOnly(2026, 11, 1), 1000m, null,
        [
            new CreateRenovationPurchaseLineRequest(30, 2m),   // 2 × 289 = 578
            new CreateRenovationPurchaseLineRequest(31, 7m),   // 7 × 59 = 413
        ]);

        var result = await Handler().Handle(new CreateRenovationPurchaseCommand(10, request), TestContext.Current.CancellationToken);

        Assert.IsType<Created<RenovationPurchaseResponse>>(result);
        Assert.Equal(2, _f.Allocations.Count);
        Assert.Equal(Math.Round(1000m * 578m / 991m, 2), _f.Allocations[0].Amount);
        Assert.Equal(1000m, _f.Allocations.Sum(a => a.Amount));
        Assert.Equal(2m, _f.Allocations[0].Quantity);
    }

    [Fact]
    public async Task Handle_MarkComplete_FlagsTheLine()
    {
        var (_, floor, skirting) = _f.SeedKitchen();
        var request = new CreateRenovationPurchaseRequest(null, null, new DateOnly(2026, 11, 1), 500m, null,
            [new CreateRenovationPurchaseLineRequest(30, 1m, MarkComplete: true), new CreateRenovationPurchaseLineRequest(31, 1m)]);

        await Handler().Handle(new CreateRenovationPurchaseCommand(10, request), TestContext.Current.CancellationToken);

        Assert.True(floor.IsComplete);
        Assert.False(skirting.IsComplete);
    }

    [Fact]
    public async Task Handle_LineFromAnotherHousehold_IsRejected()
    {
        _f.SeedKitchen();
        _f.Lines[0].HouseholdId = 99;
        var request = new CreateRenovationPurchaseRequest(null, null, new DateOnly(2026, 11, 1), 500m, null,
            [new CreateRenovationPurchaseLineRequest(30, 1m)]);

        var result = await Handler().Handle(new CreateRenovationPurchaseCommand(10, request), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        Assert.Empty(_f.Purchases);
    }

    [Fact]
    public async Task Handle_DuplicateLine_IsRejected()
    {
        _f.SeedKitchen();
        var request = new CreateRenovationPurchaseRequest(null, null, new DateOnly(2026, 11, 1), 500m, null,
            [new CreateRenovationPurchaseLineRequest(30, 1m), new CreateRenovationPurchaseLineRequest(30, 2m)]);

        var result = await Handler().Handle(new CreateRenovationPurchaseCommand(10, request), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_VendorFromAnotherHousehold_IsRejected()
    {
        _f.SeedKitchen();
        _f.Vendors.Add(new Vendor { Id = 7, HouseholdId = 99, Name = "Other household" });
        var request = new CreateRenovationPurchaseRequest(null, 7, new DateOnly(2026, 11, 1), 500m, null,
            [new CreateRenovationPurchaseLineRequest(30, 1m)]);

        var result = await Handler().Handle(new CreateRenovationPurchaseCommand(10, request), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        Assert.Empty(_f.Purchases);
    }

    [Fact]
    public async Task Handle_LinkedVendor_StoresItsNameAndId()
    {
        _f.SeedKitchen();
        _f.Vendors.Add(new Vendor { Id = 7, HouseholdId = RenovationFakes.HouseholdId, Name = "Acme Tiles" });
        var request = new CreateRenovationPurchaseRequest("Typed name", 7, new DateOnly(2026, 11, 1), 500m, null,
            [new CreateRenovationPurchaseLineRequest(30, 1m)]);

        var result = await Handler().Handle(new CreateRenovationPurchaseCommand(10, request), TestContext.Current.CancellationToken);

        var created = Assert.IsType<Created<RenovationPurchaseResponse>>(result);
        Assert.Equal("Acme Tiles", _f.Purchases.Single().Vendor);
        Assert.Equal(7, _f.Purchases.Single().VendorId);
        Assert.Equal(7, created.Value!.VendorId);
    }

    [Fact]
    public async Task Handle_UnknownProject_ReturnsNotFound()
    {
        var request = new CreateRenovationPurchaseRequest(null, null, new DateOnly(2026, 11, 1), 500m, null,
            [new CreateRenovationPurchaseLineRequest(30, 1m)]);

        var result = await Handler().Handle(new CreateRenovationPurchaseCommand(10, request), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }
}

public class AddRenovationLineToInventoryHandlerTests
{
    private readonly RenovationFakes _f = new();
    private readonly List<InventoryItem> _items = [];
    private readonly List<InventoryBox> _boxes = [];
    private readonly List<InventoryStorageUnit> _storageUnits = [];

    private AddRenovationLineToInventoryHandler Handler()
    {
        var itemRepo = Substitute.For<IRepository<InventoryItem>>();
        itemRepo.Query().Returns(_ => _items.AsAsyncQueryable());
        itemRepo.When(r => r.Add(Arg.Any<InventoryItem>())).Do(c =>
        {
            var item = c.Arg<InventoryItem>();
            item.Id = 500;
            _items.Add(item);
        });
        return new(_f.Repos(), itemRepo, Repo(_boxes), Repo(_storageUnits),
            _f.HouseholdContext, _f.UnitOfWork, _f.TimeProvider);
    }

    private static IRepository<T> Repo<T>(List<T> items) where T : class
    {
        var repo = Substitute.For<IRepository<T>>();
        repo.Query().Returns(_ => items.AsAsyncQueryable());
        return repo;
    }

    private void SeedPurchasedFloor()
    {
        _f.SeedKitchen();
        _f.Purchases.Add(new RenovationPurchase
        {
            Id = 40, HouseholdId = RenovationFakes.HouseholdId, ProjectId = 10,
            PurchasedOn = new DateOnly(2026, 11, 1), TotalAmount = 289m
        });
        _f.Allocations.Add(new RenovationPurchaseAllocation { Id = 50, PurchaseId = 40, LineId = 30, Quantity = 1m, Amount = 289m });
    }

    private static AddRenovationLineToInventoryRequest Request(int? boxId = null, int? storageUnitId = null) =>
        new(boxId, storageUnitId, null, "Oak", null);

    [Fact]
    public async Task Handle_CreatesItemFromAllocation_AndLinksIt()
    {
        SeedPurchasedFloor();

        var result = await Handler().Handle(
            new AddRenovationLineToInventoryCommand(10, 40, 30, Request()), TestContext.Current.CancellationToken);

        Assert.IsType<Created<InventoryItemResponse>>(result);
        var item = Assert.Single(_items);
        Assert.Equal(RenovationFakes.HouseholdId, item.HouseholdId);
        Assert.Equal("Oak laminate 8 mm", item.Name);
        Assert.Equal("1 m²", item.Description);
        Assert.Null(item.Quantity);
        Assert.Equal(289m, item.PurchasePrice);
        Assert.Equal("Oak", item.Brand);
        Assert.Equal(new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc), item.PurchasedOn);
        Assert.Equal("Renovation: Kitchen · Floor", item.Notes);
        Assert.Equal(500, _f.Allocations.Single().InventoryItemId);
    }

    [Fact]
    public async Task Handle_PieceUnit_BecomesRoundedQuantity()
    {
        SeedPurchasedFloor();
        _f.Lines[0].Unit = "pcs";
        _f.Allocations[0].Quantity = 2.5m;

        await Handler().Handle(new AddRenovationLineToInventoryCommand(10, 40, 30, Request()), TestContext.Current.CancellationToken);

        var item = Assert.Single(_items);
        Assert.Equal(3, item.Quantity);
        Assert.Null(item.Description);
    }

    [Fact]
    public async Task Handle_CalledTwice_SecondCallConflicts()
    {
        SeedPurchasedFloor();
        var handler = Handler();

        await handler.Handle(new AddRenovationLineToInventoryCommand(10, 40, 30, Request()), TestContext.Current.CancellationToken);
        var second = await handler.Handle(new AddRenovationLineToInventoryCommand(10, 40, 30, Request()), TestContext.Current.CancellationToken);

        Assert.IsType<Conflict<string>>(second);
        Assert.Single(_items);
    }

    [Fact]
    public async Task Handle_PurchaseDeleted_ReturnsNotFound()
    {
        SeedPurchasedFloor();
        _f.Purchases[0].DeletedOn = DateTime.UtcNow;

        var result = await Handler().Handle(
            new AddRenovationLineToInventoryCommand(10, 40, 30, Request()), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
        Assert.Empty(_items);
    }

    [Fact]
    public async Task Handle_UnknownBox_ReturnsBadRequest()
    {
        SeedPurchasedFloor();

        var result = await Handler().Handle(
            new AddRenovationLineToInventoryCommand(10, 40, 30, Request(boxId: 77)), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        Assert.Empty(_items);
    }
}

public class RenovationProjectLoaderTests
{
    [Fact]
    public async Task Load_PartialPurchase_ForecastsTheRemainder()
    {
        var f = new RenovationFakes();
        f.SeedKitchen();
        f.Purchases.Add(new RenovationPurchase { Id = 40, HouseholdId = RenovationFakes.HouseholdId, ProjectId = 10, TotalAmount = 1800m });
        f.Allocations.Add(new RenovationPurchaseAllocation { Id = 50, PurchaseId = 40, LineId = 30, Quantity = 6m, Amount = 1800m });

        var project = (await RenovationProjectLoader.Load(f.Repos(), RenovationFakes.HouseholdId, 10, TestContext.Current.CancellationToken)).Single();

        var floor = project.Rooms.Single().Lines.Single(l => l.Id == 30);
        Assert.Equal("Partial", floor.Status);
        Assert.Equal(6m, floor.PurchasedQuantity);
        Assert.Equal(7.86m, floor.RemainingQuantity);
        Assert.Equal(1800m, project.Actual);
        Assert.Equal(4005.54m + 876.15m, project.Estimate);
        Assert.Equal(1800m + 2271.54m + 876.15m, project.Forecast);
    }

    [Fact]
    public async Task Load_IgnoresDeletedPurchases()
    {
        var f = new RenovationFakes();
        f.SeedKitchen();
        f.Purchases.Add(new RenovationPurchase { Id = 40, HouseholdId = RenovationFakes.HouseholdId, ProjectId = 10, DeletedOn = DateTime.UtcNow });
        f.Allocations.Add(new RenovationPurchaseAllocation { Id = 50, PurchaseId = 40, LineId = 30, Quantity = 6m, Amount = 1800m });

        var project = (await RenovationProjectLoader.Load(f.Repos(), RenovationFakes.HouseholdId, 10, TestContext.Current.CancellationToken)).Single();

        Assert.Equal(0m, project.Actual);
        Assert.Equal(project.Estimate, project.Forecast);
    }

    [Fact]
    public async Task Load_OtherHouseholdsProject_IsNotReturned()
    {
        var f = new RenovationFakes();
        f.SeedKitchen();
        f.Projects[0].HouseholdId = 99;

        var projects = await RenovationProjectLoader.Load(f.Repos(), RenovationFakes.HouseholdId, 10, TestContext.Current.CancellationToken);

        Assert.Empty(projects);
    }
}

public class CreateRenovationRoomHandlerTests
{
    [Fact]
    public async Task Handle_UsesHouseholdMaterialPrice_AndCreatesMissingMaterials()
    {
        var f = new RenovationFakes();
        f.Projects.Add(new RenovationProject { Id = 10, HouseholdId = RenovationFakes.HouseholdId, Name = "P" });
        f.Materials.Add(new RenovationMaterial
        {
            Id = 7, HouseholdId = RenovationFakes.HouseholdId, Name = "oak laminate 8 mm", Category = "Flooring",
            Unit = "m²", DefaultPrice = 300m, WastePercent = 8m
        });
        var handler = new CreateRenovationRoomHandler(f.Repos(), f.HouseholdContext, f.UnitOfWork, f.TimeProvider);

        var result = await handler.Handle(new CreateRenovationRoomCommand(10,
            new CreateRenovationRoomRequest("Bedroom", "bedroom", 3.6m, 3.2m, 2.5m, 1, 1, ["floor", "walls"])),
            TestContext.Current.CancellationToken);

        Assert.IsType<Created<RenovationRoomResponse>>(result);
        var floor = f.Lines.Single(l => l.Label == "Floor");
        Assert.Equal(7, floor.MaterialId);
        Assert.Equal(300m, floor.UnitPrice);
        Assert.Equal(8m, floor.WastePercent);
        Assert.Single(f.Materials, m => m.Name == "Wall paint, 2 coats");
        Assert.Equal(2, f.Lines.Count);
    }

    [Fact]
    public async Task Handle_NullLineKeys_UsesTemplateDefaults()
    {
        var f = new RenovationFakes();
        f.Projects.Add(new RenovationProject { Id = 10, HouseholdId = RenovationFakes.HouseholdId, Name = "P" });
        var handler = new CreateRenovationRoomHandler(f.Repos(), f.HouseholdContext, f.UnitOfWork, f.TimeProvider);

        await handler.Handle(new CreateRenovationRoomCommand(10,
            new CreateRenovationRoomRequest("Bedroom", "bedroom", 3.6m, 3.2m, 2.5m, 1, 1, null)),
            TestContext.Current.CancellationToken);

        Assert.Equal(["Floor", "Underlay", "Walls", "Ceiling", "Skirting"], f.Lines.Select(l => l.Label).ToList());
    }

    [Fact]
    public async Task Handle_UnknownRoomType_ReturnsBadRequest()
    {
        var f = new RenovationFakes();
        f.Projects.Add(new RenovationProject { Id = 10, HouseholdId = RenovationFakes.HouseholdId, Name = "P" });
        var handler = new CreateRenovationRoomHandler(f.Repos(), f.HouseholdContext, f.UnitOfWork, f.TimeProvider);

        var result = await handler.Handle(new CreateRenovationRoomCommand(10,
            new CreateRenovationRoomRequest("Garage", "garage", 3m, 3m, 2.5m, 1, 0, null)),
            TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }
}
