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

public class AddShoppingListItemHandlerTests
{
    private readonly IRepository<ShoppingList> _listRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IRepository<ShoppingListRecommendation> _recommendationRepo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IRealtimeNotifier _realtimeNotifier = Substitute.For<IRealtimeNotifier>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private AddShoppingListItemHandler CreateHandler() =>
        new(_listRepo, _itemRepo, _recommendationRepo, _householdContext, _unitOfWork, _timeProvider, _realtimeNotifier);

    public AddShoppingListItemHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenListNotFound_ReturnsNotFound()
    {
        _listRepo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddShoppingListItemCommand(1, "Milk", null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenListDeleted_ReturnsNotFound()
    {
        _listRepo.Query().Returns(new List<ShoppingList>
        {
            new() { Id = 1, Name = "List", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddShoppingListItemCommand(1, "Milk", null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_AddsItemAndCreatesRecommendation()
    {
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 1, Name = "My List", HouseholdId = 0 } }.AsAsyncQueryable());
        _recommendationRepo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddShoppingListItemCommand(1, "Milk", 2, "liters"), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.ShoppingListId == 1 &&
            i.Name == "Milk" &&
            i.Amount == 2 &&
            i.Unit == "liters"));

        _recommendationRepo.Received(1).Add(Arg.Is<ShoppingListRecommendation>(r =>
            r.Name == "Milk" && r.IsApproved));

        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DoesNotCreateDuplicateRecommendation_CaseInsensitive()
    {
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 1, Name = "My List", HouseholdId = 0 } }.AsAsyncQueryable());
        _recommendationRepo.Query().Returns(
            new List<ShoppingListRecommendation>
            {
                new() { Id = 1, Name = "milk" }
            }.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddShoppingListItemCommand(1, "Milk", null, null), TestContext.Current.CancellationToken);

        _recommendationRepo.DidNotReceive().Add(Arg.Any<ShoppingListRecommendation>());
    }

    [Fact]
    public async Task Handle_TrimsNameForRecommendation()
    {
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 1, Name = "My List", HouseholdId = 0 } }.AsAsyncQueryable());
        _recommendationRepo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddShoppingListItemCommand(1, "  Bread  ", null, null), TestContext.Current.CancellationToken);

        _recommendationRepo.Received(1).Add(Arg.Is<ShoppingListRecommendation>(r =>
            r.Name == "Bread"));
    }

    [Fact]
    public async Task Handle_DoesNotCreateRecommendationWhenSoftDeletedOneExists()
    {
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 1, Name = "My List", HouseholdId = 0 } }.AsAsyncQueryable());
        _recommendationRepo.Query().Returns(
            new List<ShoppingListRecommendation>
            {
                new() { Id = 1, Name = "Flour", DeletedOn = DateTime.UtcNow }
            }.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddShoppingListItemCommand(1, "Flour", null, null), TestContext.Current.CancellationToken);

        _recommendationRepo.DidNotReceive().Add(Arg.Any<ShoppingListRecommendation>());
    }

    [Fact]
    public async Task Handle_AutoApprovesNewRecommendation()
    {
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 1, Name = "My List", HouseholdId = 0 } }.AsAsyncQueryable());
        _recommendationRepo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddShoppingListItemCommand(1, "Tomato", null, null), TestContext.Current.CancellationToken);

        _recommendationRepo.Received(1).Add(Arg.Is<ShoppingListRecommendation>(r =>
            r.Name == "Tomato" && r.IsApproved));
    }
}
