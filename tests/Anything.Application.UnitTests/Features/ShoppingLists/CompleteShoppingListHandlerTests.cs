using Anything.Application.Features.ShoppingLists.Commands;
using Anything.Application.Realtime;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.ShoppingLists;

public class CompleteShoppingListHandlerTests
{
    private readonly IRepository<ShoppingList> _listRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private CompleteShoppingListHandler CreateHandler() =>
        new(_listRepo, _itemRepo, _unitOfWork, _timeProvider, _realtimeNotifier);

    public CompleteShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _listRepo.GetById(1).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new CompleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenListDeleted_ReturnsNotFound()
    {
        _listRepo.GetById(1).Returns(new ShoppingList
        {
            Id = 1, Name = "List", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        var handler = CreateHandler();
        var result = await handler.Handle(new CompleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithMarkUnchecked_CompletesAllUncheckedItems()
    {
        var list = new ShoppingList { Id = 1, Name = "Weekly Shop" };
        _listRepo.GetById(1).Returns(list);

        var items = new List<ShoppingListItem>
        {
            new() { Id = 1, ShoppingListId = 1, Name = "Milk", IsChecked = false },
            new() { Id = 2, ShoppingListId = 1, Name = "Eggs", IsChecked = false }
        };
        _itemRepo.Query().Returns(items.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new CompleteShoppingListCommand(1, MarkUnchecked: true), TestContext.Current.CancellationToken);

        Assert.True(items[0].IsChecked);
        Assert.True(items[1].IsChecked);
        Assert.NotNull(items[0].CompletedOn);
        Assert.NotNull(items[1].CompletedOn);
    }

    [Fact]
    public async Task Handle_WithoutMarkUnchecked_OnlyCompletesAlreadyCheckedItems()
    {
        var list = new ShoppingList { Id = 1, Name = "Weekly Shop" };
        _listRepo.GetById(1).Returns(list);

        var items = new List<ShoppingListItem>
        {
            new() { Id = 1, ShoppingListId = 1, Name = "Milk", IsChecked = false },
            new() { Id = 2, ShoppingListId = 1, Name = "Bread", IsChecked = true }
        };
        _itemRepo.Query().Returns(items.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new CompleteShoppingListCommand(1, MarkUnchecked: false), TestContext.Current.CancellationToken);

        Assert.False(items[0].IsChecked);
        Assert.Null(items[0].CompletedOn);
        Assert.NotNull(items[1].CompletedOn);
    }

    [Fact]
    public async Task Handle_DoesNotSoftDeleteListOrCreateNewList()
    {
        var list = new ShoppingList { Id = 1, Name = "Weekly Shop" };
        _listRepo.GetById(1).Returns(list);
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new CompleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.Null(list.DeletedOn);
        _listRepo.DidNotReceive().Add(Arg.Any<ShoppingList>());
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Handle_WithEmptyList_ReturnsNoContent()
    {
        var list = new ShoppingList { Id = 1, Name = "Empty List" };
        _listRepo.GetById(1).Returns(list);
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new CompleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
