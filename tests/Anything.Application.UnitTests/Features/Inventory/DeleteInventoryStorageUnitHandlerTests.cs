using Anything.Application.Features.Inventory.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Inventory;

public class DeleteInventoryStorageUnitHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _storageUnitRepo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IRepository<InventoryBox> _boxRepo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IRepository<InventoryItem> _itemRepo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private DeleteInventoryStorageUnitHandler CreateHandler() =>
        new(_storageUnitRepo, _boxRepo, _itemRepo, _unitOfWork, _timeProvider);

    public DeleteInventoryStorageUnitHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _storageUnitRepo.GetById(1).Returns((InventoryStorageUnit?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryStorageUnitCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenAlreadyDeleted_ReturnsNotFound()
    {
        _storageUnitRepo.GetById(1).Returns(new InventoryStorageUnit
        {
            Id = 1, Name = "Unit", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryStorageUnitCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithActiveBoxes_ReturnsConflict()
    {
        _storageUnitRepo.GetById(1).Returns(new InventoryStorageUnit { Id = 1, Name = "Unit" });

        var boxes = new List<InventoryBox> { new() { Id = 1, Number = 1, StorageUnitId = 1 } };
        _boxRepo.Query().Returns(boxes.AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryStorageUnitCommand(1));

        Assert.IsType<Conflict<string>>(result);
    }

    [Fact]
    public async Task Handle_WithActiveItems_ReturnsConflict()
    {
        _storageUnitRepo.GetById(1).Returns(new InventoryStorageUnit { Id = 1, Name = "Unit" });

        _boxRepo.Query().Returns(new List<InventoryBox>().AsAsyncQueryable());
        var items = new List<InventoryItem>
        {
            new() { Id = 1, Name = "Item", StorageUnitId = 1 }
        };
        _itemRepo.Query().Returns(items.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryStorageUnitCommand(1));

        Assert.IsType<Conflict<string>>(result);
    }

    [Fact]
    public async Task Handle_WithNoActiveChildren_SoftDeletesSuccessfully()
    {
        var unit = new InventoryStorageUnit { Id = 1, Name = "Unit" };
        _storageUnitRepo.GetById(1).Returns(unit);

        _boxRepo.Query().Returns(new List<InventoryBox>().AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryStorageUnitCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.NotNull(unit.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDeletedBoxesOnly_SoftDeletesSuccessfully()
    {
        var unit = new InventoryStorageUnit { Id = 1, Name = "Unit" };
        _storageUnitRepo.GetById(1).Returns(unit);

        // The query filters DeletedOn == null, so deleted boxes won't appear
        _boxRepo.Query().Returns(new List<InventoryBox>().AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryStorageUnitCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.NotNull(unit.DeletedOn);
    }
}
