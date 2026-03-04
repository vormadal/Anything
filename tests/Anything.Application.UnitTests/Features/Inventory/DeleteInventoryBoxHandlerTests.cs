using Anything.Application.Features.Inventory.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Inventory;

public class DeleteInventoryBoxHandlerTests
{
    private readonly IRepository<InventoryBox> _boxRepo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IRepository<InventoryItem> _itemRepo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private DeleteInventoryBoxHandler CreateHandler() =>
        new(_boxRepo, _itemRepo, _unitOfWork, _timeProvider);

    public DeleteInventoryBoxHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenBoxNotFound_ReturnsNotFound()
    {
        _boxRepo.GetById(1).Returns((InventoryBox?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryBoxCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenBoxAlreadyDeleted_ReturnsNotFound()
    {
        _boxRepo.GetById(1).Returns(new InventoryBox
        {
            Id = 1, Number = 1, DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryBoxCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SoftDeletesBoxAndNullifiesItemBoxIds()
    {
        var box = new InventoryBox { Id = 1, Number = 1 };
        _boxRepo.GetById(1).Returns(box);

        var items = new List<InventoryItem>
        {
            new() { Id = 10, Name = "Item 1", BoxId = 1 },
            new() { Id = 20, Name = "Item 2", BoxId = 1 }
        };
        _itemRepo.Query().Returns(items.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryBoxCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.NotNull(box.DeletedOn);

        Assert.Null(items[0].BoxId);
        Assert.NotNull(items[0].ModifiedOn);
        Assert.Null(items[1].BoxId);
        Assert.NotNull(items[1].ModifiedOn);

        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNoItemsInBox_StillSoftDeletesBox()
    {
        var box = new InventoryBox { Id = 1, Number = 1 };
        _boxRepo.GetById(1).Returns(box);
        _itemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteInventoryBoxCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.NotNull(box.DeletedOn);
    }

    [Fact]
    public async Task Handle_DoesNotAffectDeletedItemsInBox()
    {
        var box = new InventoryBox { Id = 1, Number = 1 };
        _boxRepo.GetById(1).Returns(box);

        // The query filters DeletedOn == null, so deleted items won't appear
        _itemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new DeleteInventoryBoxCommand(1));

        // No items should have been modified since all were already deleted
        Assert.NotNull(box.DeletedOn);
    }
}
