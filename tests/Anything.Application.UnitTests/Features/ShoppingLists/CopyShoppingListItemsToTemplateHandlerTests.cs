using Anything.Application.Features.ShoppingLists.Commands;
using Anything.Application.Realtime;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.ShoppingLists;

public class CopyShoppingListItemsToTemplateHandlerTests
{
    private readonly IRepository<ShoppingList> _listRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();

    private CopyShoppingListItemsToTemplateHandler CreateHandler() =>
        new(_listRepo, _itemRepo, _householdContext, _unitOfWork, _timeProvider, _realtimeNotifier);

    public CopyShoppingListItemsToTemplateHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _listRepo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new CopyShoppingListItemsToTemplateCommand(1, [10]), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenListHasNoSourceTemplate_ReturnsBadRequest()
    {
        _listRepo.Query().Returns(new List<ShoppingList>
        {
            new() { Id = 1, HouseholdId = 1, Name = "List" }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new CopyShoppingListItemsToTemplateCommand(1, [10]), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenTemplateNotFound_ReturnsNotFound()
    {
        _listRepo.Query().Returns(new List<ShoppingList>
        {
            new() { Id = 1, HouseholdId = 1, Name = "List", SourceTemplateId = 99 }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new CopyShoppingListItemsToTemplateCommand(1, [10]), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_CopiesSelectedItemsIntoTemplate_MergingByName()
    {
        var list = new ShoppingList { Id = 1, HouseholdId = 1, Name = "List", SourceTemplateId = 2 };
        var template = new ShoppingList { Id = 2, HouseholdId = 1, Name = "Template", IsTemplate = true };
        var newItem = new ShoppingListItem { Id = 10, ShoppingListId = 1, Name = "Paper towels" };
        var existingOnListToo = new ShoppingListItem { Id = 11, ShoppingListId = 1, Name = "Milk" };
        var templateMilk = new ShoppingListItem { Id = 20, ShoppingListId = 2, Name = "Milk" };

        _listRepo.Query().Returns(new List<ShoppingList> { list, template }.AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<ShoppingListItem> { newItem, existingOnListToo, templateMilk }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new CopyShoppingListItemsToTemplateCommand(1, [10, 11]), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i => i.ShoppingListId == 2 && i.Name == "Paper towels"));
        _itemRepo.DidNotReceive().Add(Arg.Is<ShoppingListItem>(i => i.Name == "Milk"));
        _itemRepo.Received(1).Update(Arg.Is<ShoppingListItem>(i => i.Id == 20));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
