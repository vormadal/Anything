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
    public async Task Handle_ChecksAllUncheckedItems()
    {
        var list = new ShoppingList { Id = 1, Name = "Weekly Shop" };
        _listRepo.GetById(1).Returns(list);

        var items = new List<ShoppingListItem>
        {
            new() { Id = 1, ShoppingListId = 1, Name = "Milk", IsChecked = false },
            new() { Id = 2, ShoppingListId = 1, Name = "Bread", IsChecked = true },
            new() { Id = 3, ShoppingListId = 1, Name = "Eggs", IsChecked = false }
        };
        _itemRepo.Query().Returns(items.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new CompleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.True(items[0].IsChecked);
        Assert.True(items[1].IsChecked); // Was already checked
        Assert.True(items[2].IsChecked);

        // Only unchecked items should get ModifiedOn set
        Assert.NotNull(items[0].ModifiedOn);
        Assert.Null(items[1].ModifiedOn); // Already checked, no modification
        Assert.NotNull(items[2].ModifiedOn);
    }

    [Fact]
    public async Task Handle_SoftDeletesOldListAndCreatesNewOne()
    {
        var list = new ShoppingList { Id = 1, Name = "Weekly Shop" };
        _listRepo.GetById(1).Returns(list);
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new CompleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        // Old list should be soft-deleted
        Assert.NotNull(list.DeletedOn);

        // New list should be created with the same name
        _listRepo.Received(1).Add(Arg.Is<ShoppingList>(l => l.Name == "Weekly Shop"));

        Assert.IsType<Created<ShoppingList>>(result);
    }

    [Fact]
    public async Task Handle_WithEmptyList_StillCompletesAndCreatesNew()
    {
        var list = new ShoppingList { Id = 1, Name = "Empty List" };
        _listRepo.GetById(1).Returns(list);
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new CompleteShoppingListCommand(1), TestContext.Current.CancellationToken);

        Assert.NotNull(list.DeletedOn);
        _listRepo.Received(1).Add(Arg.Is<ShoppingList>(l => l.Name == "Empty List"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
