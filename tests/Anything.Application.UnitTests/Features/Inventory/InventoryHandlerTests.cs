using Anything.Application.Features.Inventory.Commands;
using Anything.Application.Features.Inventory.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Inventory;

public class CreateInventoryBoxHandlerTests
{
    private readonly IRepository<InventoryBox> _boxRepo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IRepository<InventoryStorageUnit> _storageRepo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public CreateInventoryBoxHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WithNoStorageUnit_CreatesBoxAndReturnsCreated()
    {
        var handler = new CreateInventoryBoxHandler(_boxRepo, _storageRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryBoxCommand(5, null));

        Assert.IsType<Created<InventoryBox>>(result);
        _boxRepo.Received(1).Add(Arg.Is<InventoryBox>(b => b.Number == 5));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidStorageUnit_ReturnsBadRequest()
    {
        _storageRepo.GetById(99).Returns((InventoryStorageUnit?)null);
        var handler = new CreateInventoryBoxHandler(_boxRepo, _storageRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryBoxCommand(1, 99));

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithValidStorageUnit_CreatesBoxAndReturnsCreated()
    {
        _storageRepo.GetById(1).Returns(new InventoryStorageUnit { Id = 1, Name = "Fridge" });
        var handler = new CreateInventoryBoxHandler(_boxRepo, _storageRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryBoxCommand(3, 1));

        Assert.IsType<Created<InventoryBox>>(result);
        _boxRepo.Received(1).Add(Arg.Is<InventoryBox>(b => b.StorageUnitId == 1));
    }
}

public class UpdateInventoryBoxHandlerTests
{
    private readonly IRepository<InventoryBox> _boxRepo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IRepository<InventoryStorageUnit> _storageRepo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateInventoryBoxHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _boxRepo.GetById(1).Returns((InventoryBox?)null);
        var result = await new UpdateInventoryBoxHandler(_boxRepo, _storageRepo, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryBoxCommand(1, 5, null));
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithInvalidStorageUnit_ReturnsBadRequest()
    {
        _boxRepo.GetById(1).Returns(new InventoryBox { Id = 1, Number = 1 });
        _storageRepo.GetById(99).Returns((InventoryStorageUnit?)null);

        var result = await new UpdateInventoryBoxHandler(_boxRepo, _storageRepo, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryBoxCommand(1, 1, 99));

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNumberAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryBox { Id = 1, Number = 1 };
        _boxRepo.GetById(1).Returns(entity);

        var result = await new UpdateInventoryBoxHandler(_boxRepo, _storageRepo, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryBoxCommand(1, 10, null));

        Assert.IsType<NoContent>(result);
        Assert.Equal(10, entity.Number);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class UpdateInventoryItemHandlerTests
{
    private readonly IRepository<InventoryItem> _itemRepo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IRepository<InventoryBox> _boxRepo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IRepository<InventoryStorageUnit> _storageRepo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateInventoryItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _itemRepo.GetById(1).Returns((InventoryItem?)null);
        var result = await new UpdateInventoryItemHandler(_itemRepo, _boxRepo, _storageRepo, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryItemCommand(1, "X", null, null, null));
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryItem { Id = 1, Name = "Old" };
        _itemRepo.GetById(1).Returns(entity);

        var result = await new UpdateInventoryItemHandler(_itemRepo, _boxRepo, _storageRepo, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryItemCommand(1, "New", "desc", null, null));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal("desc", entity.Description);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteInventoryItemHandlerTests
{
    private readonly IRepository<InventoryItem> _repo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteInventoryItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((InventoryItem?)null);
        var result = await new DeleteInventoryItemHandler(_repo, _unitOfWork, _timeProvider).Handle(new DeleteInventoryItemCommand(1));
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryItem { Id = 1, Name = "Widget" };
        _repo.GetById(1).Returns(entity);

        var result = await new DeleteInventoryItemHandler(_repo, _unitOfWork, _timeProvider).Handle(new DeleteInventoryItemCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class CreateInventoryStorageUnitHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _repo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public CreateInventoryStorageUnitHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesStorageUnitAndReturnsEntity()
    {
        var handler = new CreateInventoryStorageUnitHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryStorageUnitCommand("Fridge", "refrigerator"));

        Assert.Equal("Fridge", result.Name);
        Assert.Equal("refrigerator", result.Type);
        _repo.Received(1).Add(Arg.Is<InventoryStorageUnit>(s => s.Name == "Fridge"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class UpdateInventoryStorageUnitHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _repo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateInventoryStorageUnitHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((InventoryStorageUnit?)null);
        var result = await new UpdateInventoryStorageUnitHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "X", null));
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndTypeAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryStorageUnit { Id = 1, Name = "Old", Type = "freezer" };
        _repo.GetById(1).Returns(entity);

        var result = await new UpdateInventoryStorageUnitHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "New Fridge", "refrigerator"));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Fridge", entity.Name);
        Assert.Equal("refrigerator", entity.Type);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetInventoryBoxesHandlerTests
{
    private readonly IRepository<InventoryBox> _repo = Substitute.For<IRepository<InventoryBox>>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedBoxes()
    {
        _repo.Query().Returns(new List<InventoryBox>
        {
            new() { Id = 1, Number = 1 },
            new() { Id = 2, Number = 2, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetInventoryBoxesHandler(_repo).Handle(new GetInventoryBoxesQuery());

        Assert.Single(result);
        Assert.Equal(1, result[0].Number);
    }
}

public class GetInventoryBoxByIdHandlerTests
{
    private readonly IRepository<InventoryBox> _repo = Substitute.For<IRepository<InventoryBox>>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((InventoryBox?)null);
        var result = await new GetInventoryBoxByIdHandler(_repo).Handle(new GetInventoryBoxByIdQuery(1));
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOk()
    {
        _repo.GetById(1).Returns(new InventoryBox { Id = 1, Number = 5 });
        var result = await new GetInventoryBoxByIdHandler(_repo).Handle(new GetInventoryBoxByIdQuery(1));
        var ok = Assert.IsType<Ok<InventoryBox>>(result);
        Assert.Equal(5, ok.Value!.Number);
    }
}

public class GetInventoryItemsHandlerTests
{
    private readonly IRepository<InventoryItem> _repo = Substitute.For<IRepository<InventoryItem>>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedItems()
    {
        _repo.Query().Returns(new List<InventoryItem>
        {
            new() { Id = 1, Name = "Widget" },
            new() { Id = 2, Name = "Deleted", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetInventoryItemsHandler(_repo).Handle(new GetInventoryItemsQuery());

        Assert.Single(result);
        Assert.Equal("Widget", result[0].Name);
    }
}

public class GetInventoryItemByIdHandlerTests
{
    private readonly IRepository<InventoryItem> _repo = Substitute.For<IRepository<InventoryItem>>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((InventoryItem?)null);
        var result = await new GetInventoryItemByIdHandler(_repo).Handle(new GetInventoryItemByIdQuery(1));
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOk()
    {
        _repo.GetById(1).Returns(new InventoryItem { Id = 1, Name = "Widget" });
        var result = await new GetInventoryItemByIdHandler(_repo).Handle(new GetInventoryItemByIdQuery(1));
        var ok = Assert.IsType<Ok<InventoryItem>>(result);
        Assert.Equal("Widget", ok.Value!.Name);
    }
}

public class GetInventoryStorageUnitsHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _repo = Substitute.For<IRepository<InventoryStorageUnit>>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedUnits()
    {
        _repo.Query().Returns(new List<InventoryStorageUnit>
        {
            new() { Id = 1, Name = "Fridge" },
            new() { Id = 2, Name = "Deleted", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetInventoryStorageUnitsHandler(_repo).Handle(new GetInventoryStorageUnitsQuery());

        Assert.Single(result);
        Assert.Equal("Fridge", result[0].Name);
    }
}

public class GetInventoryStorageUnitByIdHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _repo = Substitute.For<IRepository<InventoryStorageUnit>>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((InventoryStorageUnit?)null);
        var result = await new GetInventoryStorageUnitByIdHandler(_repo).Handle(new GetInventoryStorageUnitByIdQuery(1));
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOk()
    {
        _repo.GetById(1).Returns(new InventoryStorageUnit { Id = 1, Name = "Freezer" });
        var result = await new GetInventoryStorageUnitByIdHandler(_repo).Handle(new GetInventoryStorageUnitByIdQuery(1));
        var ok = Assert.IsType<Ok<InventoryStorageUnit>>(result);
        Assert.Equal("Freezer", ok.Value!.Name);
    }
}
