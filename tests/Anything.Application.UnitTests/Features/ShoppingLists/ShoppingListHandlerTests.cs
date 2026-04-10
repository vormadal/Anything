using Anything.Application.Features.ShoppingLists.Commands;
using Anything.Application.Features.ShoppingLists.Queries;
using Anything.Application.Realtime;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.ShoppingLists;

public class CreateShoppingListHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private CreateShoppingListHandler CreateHandler() =>
        new(_repo, _unitOfWork, _timeProvider, _realtimeNotifier);

    public CreateShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
        _repo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_CreatesListWithName()
    {
        var handler = CreateHandler();
        var result = await handler.Handle(new CreateShoppingListCommand("Groceries"), TestContext.Current.CancellationToken);

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
        var result = await handler.Handle(new CreateShoppingListCommand("List"), TestContext.Current.CancellationToken);

        Assert.Equal(now.UtcDateTime, result.CreatedOn);
    }

    [Fact]
    public async Task Handle_WhenNoExistingLists_SetsSortOrderToZero()
    {
        var handler = CreateHandler();
        var result = await handler.Handle(new CreateShoppingListCommand("First"), TestContext.Current.CancellationToken);

        Assert.Equal(0, result.SortOrder);
    }

    [Fact]
    public async Task Handle_WhenExistingLists_SetsSortOrderToMaxPlusOne()
    {
        var existing = new List<ShoppingList>
        {
            new() { Id = 1, Name = "A", SortOrder = 0 },
            new() { Id = 2, Name = "B", SortOrder = 1 },
        };
        _repo.Query().Returns(existing.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new CreateShoppingListCommand("New"), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.SortOrder);
    }
}

public class UpdateShoppingListHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private UpdateShoppingListHandler CreateHandler() =>
        new(_repo, _unitOfWork, _timeProvider, _realtimeNotifier);

    public UpdateShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListCommand(1, "New Name"), TestContext.Current.CancellationToken);

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
        var result = await handler.Handle(new UpdateShoppingListCommand(1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndReturnsNoContent()
    {
        var list = new ShoppingList { Id = 1, Name = "Old Name" };
        _repo.GetById(1).Returns(list);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListCommand(1, "New Name"), TestContext.Current.CancellationToken);

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
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private DeleteShoppingListHandler CreateHandler() =>
        new(_repo, _unitOfWork, _timeProvider, _realtimeNotifier);

    public DeleteShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListCommand(1), TestContext.Current.CancellationToken);

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
        var result = await handler.Handle(new DeleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SoftDeletesListAndReturnsNoContent()
    {
        var list = new ShoppingList { Id = 1, Name = "Weekly Shop" };
        _repo.GetById(1).Returns(list);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.NotNull(list.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteShoppingListItemHandlerTests
{
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private DeleteShoppingListItemHandler CreateHandler() =>
        new(_itemRepo, _unitOfWork, _realtimeNotifier);

    [Fact]
    public async Task Handle_WhenItemNotFound_ReturnsNotFound()
    {
        _itemRepo.GetById(1).Returns((ShoppingListItem?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListItemCommand(1, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenItemBelongsToDifferentList_ReturnsNotFound()
    {
        _itemRepo.GetById(5).Returns(new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 99 });

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListItemCommand(1, 5), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_RemovesItemAndReturnsNoContent()
    {
        var item = new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 1 };
        _itemRepo.GetById(5).Returns(item);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteShoppingListItemCommand(1, 5), TestContext.Current.CancellationToken);

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
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private UpdateShoppingListItemHandler CreateHandler() =>
        new(_itemRepo, _unitOfWork, _timeProvider, _realtimeNotifier);

    public UpdateShoppingListItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenItemNotFound_ReturnsNotFound()
    {
        _itemRepo.GetById(1).Returns((ShoppingListItem?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListItemCommand(1, 1, "Milk", false, null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenItemBelongsToDifferentList_ReturnsNotFound()
    {
        _itemRepo.GetById(5).Returns(new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 99 });

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListItemCommand(1, 5, "Milk", false, null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesItemAndReturnsNoContent()
    {
        var item = new ShoppingListItem { Id = 5, Name = "Milk", ShoppingListId = 1, IsChecked = false };
        _itemRepo.GetById(5).Returns(item);

        var handler = CreateHandler();
        var result = await handler.Handle(new UpdateShoppingListItemCommand(1, 5, "Oat Milk", true, 2.5m, "L"), TestContext.Current.CancellationToken);

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
        var result = await handler.Handle(new GetShoppingListsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Active", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsEmptyWhenNoActiveLists()
    {
        _repo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListsQuery(), TestContext.Current.CancellationToken);

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
            new() { Id = 2, ShoppingListId = 1, Name = "Bread", IsChecked = true, CompletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 3, ShoppingListId = 1, Name = "Eggs", IsChecked = false },
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());
        _itemRepo.Query().Returns(items.AsQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal(2, result[0].UncheckedItemCount);
    }

    [Fact]
    public async Task Handle_CheckedButNotCompletedItemsAreNotCountedAsUnchecked()
    {
        var lists = new List<ShoppingList>
        {
            new() { Id = 1, Name = "Groceries" }
        };
        var items = new List<ShoppingListItem>
        {
            new() { Id = 1, ShoppingListId = 1, Name = "Milk", IsChecked = false },
            new() { Id = 2, ShoppingListId = 1, Name = "Bread", IsChecked = true }, // checked but not completed
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());
        _itemRepo.Query().Returns(items.AsQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal(1, result[0].UncheckedItemCount); // only unchecked item counts
    }
}

public class GetShoppingListByIdHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();

    private GetShoppingListByIdHandler CreateHandler() => new(_repo);

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenListFound_ReturnsOkWithList()
    {
        var list = new ShoppingList { Id = 1, Name = "My List" };
        _repo.Query().Returns(new List<ShoppingList> { list }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListByIdQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<ShoppingList>>(result);
        Assert.Equal("My List", ok.Value!.Name);
    }

    [Fact]
    public async Task Handle_WhenListIsSoftDeleted_ReturnsNotFound()
    {
        var list = new ShoppingList { Id = 1, Name = "Deleted List", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) };
        _repo.Query().Returns(new List<ShoppingList> { list }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetShoppingListByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }
}

public class ReorderShoppingListsHandlerTests
{
    private readonly IRepository<ShoppingList> _repo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private ReorderShoppingListsHandler CreateHandler() => new(_repo, _unitOfWork, _realtimeNotifier);

    [Fact]
    public async Task Handle_UpdatesSortOrderForAllMatchingLists()
    {
        var lists = new List<ShoppingList>
        {
            new() { Id = 1, Name = "A", SortOrder = 0 },
            new() { Id = 2, Name = "B", SortOrder = 1 },
            new() { Id = 3, Name = "C", SortOrder = 2 },
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new ReorderShoppingListsCommand([3, 1, 2]), TestContext.Current.CancellationToken);

        Assert.IsType<Microsoft.AspNetCore.Http.HttpResults.NoContent>(result);
        Assert.Equal(0, lists.First(l => l.Id == 3).SortOrder);
        Assert.Equal(1, lists.First(l => l.Id == 1).SortOrder);
        Assert.Equal(2, lists.First(l => l.Id == 2).SortOrder);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_IgnoresIdsNotInRepository()
    {
        var lists = new List<ShoppingList>
        {
            new() { Id = 1, Name = "A", SortOrder = 0 },
        };
        _repo.Query().Returns(lists.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new ReorderShoppingListsCommand([99, 1]), TestContext.Current.CancellationToken);

        Assert.IsType<Microsoft.AspNetCore.Http.HttpResults.NoContent>(result);
        Assert.Equal(1, lists[0].SortOrder);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
