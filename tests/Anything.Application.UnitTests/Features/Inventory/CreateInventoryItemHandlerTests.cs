using Anything.Application.Features.Inventory.Commands;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Inventory;

public class CreateInventoryItemHandlerTests
{
    private readonly IRepository<InventoryItem> _itemRepo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IRepository<InventoryBox> _boxRepo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IRepository<InventoryStorageUnit> _storageUnitRepo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private CreateInventoryItemHandler CreateHandler() =>
        new(_itemRepo, _boxRepo, _storageUnitRepo, _householdContext, _unitOfWork, _timeProvider);

    public CreateInventoryItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WithNullBoxAndStorageUnit_CreatesItem()
    {
        var handler = CreateHandler();
        var result = await handler.Handle(new CreateInventoryItemCommand("Item", "Desc", null, null), TestContext.Current.CancellationToken);

        var statusCode = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(201, statusCode.StatusCode);
        _itemRepo.Received(1).Add(Arg.Is<InventoryItem>(i =>
            i.Name == "Item" && i.Description == "Desc" && i.BoxId == null && i.StorageUnitId == null));
    }

    [Fact]
    public async Task Handle_WithValidBox_CreatesItem()
    {
        _boxRepo.GetById(1).Returns(new InventoryBox { Id = 1, Number = 1 });

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateInventoryItemCommand("Item", null, 1, null), TestContext.Current.CancellationToken);

        var statusCode = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(201, statusCode.StatusCode);
        _itemRepo.Received(1).Add(Arg.Is<InventoryItem>(i => i.BoxId == 1));
    }

    [Fact]
    public async Task Handle_WithNonExistentBox_ReturnsBadRequest()
    {
        _boxRepo.GetById(99).Returns((InventoryBox?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateInventoryItemCommand("Item", null, 99, null), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithDeletedBox_ReturnsBadRequest()
    {
        _boxRepo.GetById(1).Returns(new InventoryBox { Id = 1, Number = 1, DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) });

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateInventoryItemCommand("Item", null, 1, null), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithNonExistentStorageUnit_ReturnsBadRequest()
    {
        _storageUnitRepo.GetById(99).Returns((InventoryStorageUnit?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateInventoryItemCommand("Item", null, null, 99), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithDeletedStorageUnit_ReturnsBadRequest()
    {
        _storageUnitRepo.GetById(1).Returns(new InventoryStorageUnit { Id = 1, Name = "Unit", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) });

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateInventoryItemCommand("Item", null, null, 1), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_ValidatesBoxBeforeStorageUnit()
    {
        // If box is invalid, should return bad request before checking storage unit
        _boxRepo.GetById(99).Returns((InventoryBox?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateInventoryItemCommand("Item", null, 99, 88), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        // Storage unit should not have been checked
        await _storageUnitRepo.DidNotReceive().GetById(88);
    }
}
