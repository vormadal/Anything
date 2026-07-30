using Anything.Application.Features.Inventory.Commands;
using Anything.Application.Features.Inventory.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
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
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public CreateInventoryBoxHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WithNoStorageUnit_CreatesBoxAndReturnsCreated()
    {
        var handler = new CreateInventoryBoxHandler(_boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryBoxCommand(5, null), TestContext.Current.CancellationToken);

        Assert.IsType<Created<InventoryBoxResponse>>(result);
        _boxRepo.Received(1).Add(Arg.Is<InventoryBox>(b => b.Number == 5));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidStorageUnit_ReturnsBadRequest()
    {
        _storageRepo.Query().Returns(new List<InventoryStorageUnit>().AsAsyncQueryable());
        var handler = new CreateInventoryBoxHandler(_boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryBoxCommand(1, 99), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithValidStorageUnit_CreatesBoxAndReturnsCreated()
    {
        _storageRepo.Query().Returns(new List<InventoryStorageUnit> { new InventoryStorageUnit { Id = 1, Name = "Fridge" } }.AsAsyncQueryable());
        var handler = new CreateInventoryBoxHandler(_boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryBoxCommand(3, 1), TestContext.Current.CancellationToken);

        Assert.IsType<Created<InventoryBoxResponse>>(result);
        _boxRepo.Received(1).Add(Arg.Is<InventoryBox>(b => b.StorageUnitId == 1));
    }
}

public class UpdateInventoryBoxHandlerTests
{
    private readonly IRepository<InventoryBox> _boxRepo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IRepository<InventoryStorageUnit> _storageRepo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateInventoryBoxHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _boxRepo.Query().Returns(new List<InventoryBox>().AsAsyncQueryable());
        var result = await new UpdateInventoryBoxHandler(_boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryBoxCommand(1, 5, null), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithInvalidStorageUnit_ReturnsBadRequest()
    {
        _boxRepo.Query().Returns(new List<InventoryBox> { new InventoryBox { Id = 1, Number = 1 } }.AsAsyncQueryable());
        _storageRepo.Query().Returns(new List<InventoryStorageUnit>().AsAsyncQueryable());

        var result = await new UpdateInventoryBoxHandler(_boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryBoxCommand(1, 1, 99), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNumberAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryBox { Id = 1, Number = 1 };
        _boxRepo.Query().Returns(new List<InventoryBox> { entity }.AsAsyncQueryable());

        var result = await new UpdateInventoryBoxHandler(_boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryBoxCommand(1, 10, null), TestContext.Current.CancellationToken);

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
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateInventoryItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _itemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());
        var result = await new UpdateInventoryItemHandler(_itemRepo, _boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryItemCommand(1, "X", null, null, null), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryItem { Id = 1, Name = "Old" };
        _itemRepo.Query().Returns(new List<InventoryItem> { entity }.AsAsyncQueryable());

        var result = await new UpdateInventoryItemHandler(_itemRepo, _boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryItemCommand(1, "New", "desc", null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal("desc", entity.Description);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithBoxInAContradictingPlace_TakesTheBoxsPlaceOverTheCallers()
    {
        var entity = new InventoryItem { Id = 1, Name = "Old", StorageUnitId = 9 };
        _itemRepo.Query().Returns(new List<InventoryItem> { entity }.AsAsyncQueryable());
        // Box 1 actually lives in place 5, but the caller's command still says 9.
        _boxRepo.Query().Returns(new List<InventoryBox> { new InventoryBox { Id = 1, Number = 1, StorageUnitId = 5 } }.AsAsyncQueryable());

        var result = await new UpdateInventoryItemHandler(_itemRepo, _boxRepo, _storageRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryItemCommand(1, "Old", null, 1, 9), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(1, entity.BoxId);
        Assert.Equal(5, entity.StorageUnitId);
        _storageRepo.DidNotReceive().Query();
    }
}

public class DeleteInventoryItemHandlerTests
{
    private readonly IRepository<InventoryItem> _repo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public DeleteInventoryItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());
        var result = await new DeleteInventoryItemHandler(_repo, _householdContext, _unitOfWork, _timeProvider).Handle(new DeleteInventoryItemCommand(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryItem { Id = 1, Name = "Widget" };
        _repo.Query().Returns(new List<InventoryItem> { entity }.AsAsyncQueryable());

        var result = await new DeleteInventoryItemHandler(_repo, _householdContext, _unitOfWork, _timeProvider).Handle(new DeleteInventoryItemCommand(1), TestContext.Current.CancellationToken);

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
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public CreateInventoryStorageUnitHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesStorageUnitAndReturnsCreated()
    {
        var handler = new CreateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryStorageUnitCommand("Fridge", null), TestContext.Current.CancellationToken);

        var created = Assert.IsType<Created<InventoryStorageUnitResponse>>(result);
        Assert.Equal("Fridge", created.Value?.Name);
        _repo.Received(1).Add(Arg.Is<InventoryStorageUnit>(s => s.Name == "Fridge"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithValidParent_CreatesNestedStorageUnit()
    {
        _repo.Query().Returns(new List<InventoryStorageUnit> { new InventoryStorageUnit { Id = 1, Name = "Summerhouse" } }.AsAsyncQueryable());
        var handler = new CreateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryStorageUnitCommand("Shed", 1), TestContext.Current.CancellationToken);

        Assert.IsType<Created<InventoryStorageUnitResponse>>(result);
        _repo.Received(1).Add(Arg.Is<InventoryStorageUnit>(s => s.ParentId == 1));
    }

    [Fact]
    public async Task Handle_WithInvalidParent_ReturnsBadRequest()
    {
        _repo.Query().Returns(new List<InventoryStorageUnit>().AsAsyncQueryable());
        var handler = new CreateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateInventoryStorageUnitCommand("Shed", 99), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }
}

public class UpdateInventoryStorageUnitHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _repo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateInventoryStorageUnitHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<InventoryStorageUnit>().AsAsyncQueryable());
        var result = await new UpdateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "X", null), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new InventoryStorageUnit { Id = 1, Name = "Old" };
        _repo.Query().Returns(new List<InventoryStorageUnit> { entity }.AsAsyncQueryable());

        var result = await new UpdateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "New Fridge", null), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Fridge", entity.Name);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithValidParent_SetsParentIdAndReturnsNoContent()
    {
        var entity = new InventoryStorageUnit { Id = 1, Name = "Shed" };
        var parent = new InventoryStorageUnit { Id = 2, Name = "Summerhouse" };
        _repo.Query().Returns(new List<InventoryStorageUnit> { entity, parent }.AsAsyncQueryable());

        var result = await new UpdateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "Shed", 2), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(2, entity.ParentId);
    }

    [Fact]
    public async Task Handle_WithSelfAsParent_ReturnsBadRequest()
    {
        var entity = new InventoryStorageUnit { Id = 1, Name = "Shed" };
        _repo.Query().Returns(new List<InventoryStorageUnit> { entity }.AsAsyncQueryable());

        var result = await new UpdateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "Shed", 1), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithDescendantAsParent_ReturnsBadRequest()
    {
        // 1 (Summerhouse) -> 2 (Shed) already; trying to make 1's parent be 2 would create a cycle.
        var summerhouse = new InventoryStorageUnit { Id = 1, Name = "Summerhouse" };
        var shed = new InventoryStorageUnit { Id = 2, Name = "Shed", ParentId = 1 };
        _repo.Query().Returns(new List<InventoryStorageUnit> { summerhouse, shed }.AsAsyncQueryable());

        var result = await new UpdateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "Summerhouse", 2), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithInvalidParent_ReturnsBadRequest()
    {
        var entity = new InventoryStorageUnit { Id = 1, Name = "Shed" };
        _repo.Query().Returns(new List<InventoryStorageUnit> { entity }.AsAsyncQueryable());

        var result = await new UpdateInventoryStorageUnitHandler(_repo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new UpdateInventoryStorageUnitCommand(1, "Shed", 99), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }
}

public class GetInventoryBoxesHandlerTests
{
    private readonly IRepository<InventoryBox> _repo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedBoxes()
    {
        _repo.Query().Returns(new List<InventoryBox>
        {
            new() { Id = 1, Number = 1 },
            new() { Id = 2, Number = 2, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetInventoryBoxesHandler(_repo, _householdContext).Handle(new GetInventoryBoxesQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal(1, result[0].Number);
    }
}

public class GetInventoryBoxByIdHandlerTests
{
    private readonly IRepository<InventoryBox> _repo = Substitute.For<IRepository<InventoryBox>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<InventoryBox>().AsAsyncQueryable());
        var result = await new GetInventoryBoxByIdHandler(_repo, _householdContext).Handle(new GetInventoryBoxByIdQuery(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOk()
    {
        _repo.Query().Returns(new List<InventoryBox> { new InventoryBox { Id = 1, Number = 5 } }.AsAsyncQueryable());
        var result = await new GetInventoryBoxByIdHandler(_repo, _householdContext).Handle(new GetInventoryBoxByIdQuery(1), TestContext.Current.CancellationToken);
        var ok = Assert.IsType<Ok<InventoryBoxResponse>>(result);
        Assert.Equal(5, ok.Value!.Number);
    }
}

public class GetInventoryItemsHandlerTests
{
    private readonly IRepository<InventoryItem> _repo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedItems()
    {
        _repo.Query().Returns(new List<InventoryItem>
        {
            new() { Id = 1, Name = "Widget" },
            new() { Id = 2, Name = "Deleted", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetInventoryItemsHandler(_repo, _householdContext).Handle(new GetInventoryItemsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Widget", result[0].Name);
    }
}

public class GetInventoryItemByIdHandlerTests
{
    private readonly IRepository<InventoryItem> _repo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IRepository<InventoryItemField> _fieldRepo = Substitute.For<IRepository<InventoryItemField>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public GetInventoryItemByIdHandlerTests()
    {
        _fieldRepo.Query().Returns(new List<InventoryItemField>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());
        var result = await new GetInventoryItemByIdHandler(_repo, _fieldRepo, _householdContext).Handle(new GetInventoryItemByIdQuery(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOk()
    {
        _repo.Query().Returns(new List<InventoryItem> { new InventoryItem { Id = 1, Name = "Widget" } }.AsAsyncQueryable());
        var result = await new GetInventoryItemByIdHandler(_repo, _fieldRepo, _householdContext).Handle(new GetInventoryItemByIdQuery(1), TestContext.Current.CancellationToken);
        var ok = Assert.IsType<Ok<InventoryItemResponse>>(result);
        Assert.Equal("Widget", ok.Value!.Name);
    }

    [Fact]
    public async Task Handle_WhenFound_IncludesCustomFieldsInSortOrder()
    {
        _repo.Query().Returns(new List<InventoryItem> { new InventoryItem { Id = 1, Name = "Widget" } }.AsAsyncQueryable());
        _fieldRepo.Query().Returns(new List<InventoryItemField>
        {
            new() { Id = 1, ItemId = 1, Label = "Second", Value = "B", SortOrder = 1 },
            new() { Id = 2, ItemId = 1, Label = "First", Value = "A", SortOrder = 0 }
        }.AsAsyncQueryable());

        var result = await new GetInventoryItemByIdHandler(_repo, _fieldRepo, _householdContext).Handle(new GetInventoryItemByIdQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<InventoryItemResponse>>(result);
        Assert.Equal(["First", "Second"], ok.Value!.Fields.Select(f => f.Label));
    }
}

public class GetInventoryStorageUnitsHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _repo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedUnits()
    {
        _repo.Query().Returns(new List<InventoryStorageUnit>
        {
            new() { Id = 1, Name = "Fridge" },
            new() { Id = 2, Name = "Deleted", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetInventoryStorageUnitsHandler(_repo, _householdContext).Handle(new GetInventoryStorageUnitsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Fridge", result[0].Name);
    }
}

public class GetInventoryStorageUnitByIdHandlerTests
{
    private readonly IRepository<InventoryStorageUnit> _repo = Substitute.For<IRepository<InventoryStorageUnit>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<InventoryStorageUnit>().AsAsyncQueryable());
        var result = await new GetInventoryStorageUnitByIdHandler(_repo, _householdContext).Handle(new GetInventoryStorageUnitByIdQuery(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOk()
    {
        _repo.Query().Returns(new List<InventoryStorageUnit> { new InventoryStorageUnit { Id = 1, Name = "Freezer" } }.AsAsyncQueryable());
        var result = await new GetInventoryStorageUnitByIdHandler(_repo, _householdContext).Handle(new GetInventoryStorageUnitByIdQuery(1), TestContext.Current.CancellationToken);
        var ok = Assert.IsType<Ok<InventoryStorageUnitResponse>>(result);
        Assert.Equal("Freezer", ok.Value!.Name);
    }
}
