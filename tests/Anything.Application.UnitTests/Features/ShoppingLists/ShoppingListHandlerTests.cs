using Anything.Application.Features.ShoppingLists.Commands;
using Anything.Application.Features.ShoppingLists.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.ShoppingLists;

public class CreateShoppingListHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private CreateShoppingListHandler CreateHandler() =>
        new(_repo, _unitOfWork, _timeProvider);

    public CreateShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesListWithName()
    {
        var handler = CreateHandler();
        var result = await handler.Handle(new CreateShoppingListCommand("Groceries"));

        Assert.Equal("Groceries", result.Name);
        _repo.Received(1).Add(Arg.Is<ShoppingList>(l => l.Name == "Groceries"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsCreatedOn()
    {
        var now = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateShoppingListCommand("List"));

        Assert.Equal(now.UtcDateTime, result.CreatedOn);
    }
}

public class UpdateShoppingListHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private UpdateShoppingListHandler CreateHandler() =>
        new(_repo, _unitOfWork, _timeProvider);

    public UpdateShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListCommand(1, "New Name"));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenListDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new ShoppingList
        {
            Id = 1, Name = "Old", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListCommand(1, "New Name"));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndReturnsNoContent()
    {
        var list = new ShoppingList { Id = 1, Name = "Old Name" };
        _repo.GetById(1).Returns(list);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListCommand(1, "New Name"));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Name", list.Name);
        Assert.NotNull(list.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteShoppingListHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private DeleteShoppingListHandler CreateHandler() =>
        new(_repo, _unitOfWork, _timeProvider);

    public DeleteShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenListAlreadyDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new ShoppingList
        {
            Id = 1, Name = "List", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SoftDeletesListAndReturnsNoContent()
    {
        var list = new ShoppingList { Id = 1, Name = "Weekly Shop" };
        _repo.GetById(1).Returns(list);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.NotNull(list.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteShoppingListItemHandlerTests
{
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private DeleteShoppingListItemHandler CreateHandler() =>
        new(_itemRepo, _unitOfWork);

    [Fact]
    public async Task Handle_WhenItemNotFound_ReturnsNotFound()
    {
        _itemRepo.GetById(1).Returns((ShoppingListItem?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListItemCommand(1, 1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenItemBelongsToDifferentList_ReturnsNotFound()
    {
        _itemRepo.GetById(5).Returns(new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 99 });

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListItemCommand(1, 5));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_RemovesItemAndReturnsNoContent()
    {
        var item = new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 1 };
        _itemRepo.GetById(5).Returns(item);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListItemCommand(1, 5));

        Assert.IsType<NoContent>(result);
        _itemRepo.Received(1).Remove(item);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class UpdateShoppingListItemHandlerTests
{
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private UpdateShoppingListItemHandler CreateHandler() =>
        new(_itemRepo, _unitOfWork, _timeProvider);

    public UpdateShoppingListItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenItemNotFound_ReturnsNotFound()
    {
        _itemRepo.GetById(1).Returns((ShoppingListItem?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListItemCommand(1, 1, "Milk", false, null, null));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenItemBelongsToDifferentList_ReturnsNotFound()
    {
        _itemRepo.GetById(5).Returns(new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 99 });

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListItemCommand(1, 5, "Milk", false, null, null));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesItemAndReturnsNoContent()
    {
        var item = new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 1, IsChecked = false };
        _itemRepo.GetById(5).Returns(item);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListItemCommand(1, 5, "Oat Milk", true, 2.5m, "L"));

        Assert.IsType<NoContent>(result);
        Assert.Equal("Oat Milk", item.Name);
        Assert.True(item.IsChecked);
        Assert.Equal(2.5m, item.Amount);
        Assert.Equal("L", item.Unit);
        Assert.NotNull(item.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetShoppingListsHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();

    private GetShoppingListsHandler CreateHandler() => new(_repo, _itemRepo);

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedLists()
    {
        var lists = new List<ShoppingList>
        {
            new() { Id = 1, Name = "Active" },
            new() { Id = 2, Name = "Completed", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListsQuery());

        Assert.Single(result);
        Assert.Equal("Active", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsEmptyWhenNoActiveLists()
    {
        _repo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListsQuery());

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsCorrectUncheckedItemCount()
    {
        var lists = new List<ShoppingList>
        {
            new() { Id = 1, Name = "Groceries" }
        };
        var items = new List<ShoppingListItem>
        {
            new() { Id = 1, ShoppingListId = 1, Name = "Milk", IsChecked = false },
            new() { Id = 2, ShoppingListId = 1, Name = "Bread", IsChecked = true },
            new() { Id = 3, ShoppingListId = 1, Name = "Eggs", IsChecked = false },
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());
        _itemRepo.Query().Returns(items.AsQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListsQuery());

        Assert.Single(result);
        Assert.Equal(2, result[0].UncheckedItemCount);
    }
}

public class GetShoppingListByIdHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();

    private GetShoppingListByIdHandler CreateHandler() => new(_repo);

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListByIdQuery(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenListFound_ReturnsOkWithList()
    {
        var list = new ShoppingList { Id = 1, Name = "My List" };
        _repo.GetById(1).Returns(list);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListByIdQuery(1));

        var ok = Assert.IsType<Ok<ShoppingList>>(result);
        Assert.Equal("My List", ok.Value!.Name);
    }
}

public class GetCompletedShoppingListsHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();

    private GetCompletedShoppingListsHandler CreateHandler() => new(_repo);

    [Fact]
    public async Task Handle_ReturnsOnlyDeletedLists()
    {
        var lists = new List<ShoppingList>
        {
            new() { Id = 1, Name = "Active" },
            new() { Id = 2, Name = "Completed", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetCompletedShoppingListsQuery());

        Assert.Single(result);
        Assert.Equal("Completed", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsEmptyWhenNoCompletedLists()
    {
        _repo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetCompletedShoppingListsQuery());

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsListsOrderedByDeletedOnDescending()
    {
        var older = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var newer = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);

        var lists = new List<ShoppingList>
        {
            new() { Id = 1, Name = "OlderList", DeletedOn = older },
            new() { Id = 2, Name = "NewerList", DeletedOn = newer }
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetCompletedShoppingListsQuery());

        Assert.Equal("NewerList", result[0].Name);
        Assert.Equal("OlderList", result[1].Name);
    }
}
