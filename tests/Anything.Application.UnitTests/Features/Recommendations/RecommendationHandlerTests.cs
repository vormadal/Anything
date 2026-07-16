using Anything.Application.Features.Recommendations.Commands;
using Anything.Application.Features.Recommendations.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Recommendations;

public class CreateRecommendationHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IRepository<ShoppingList> _listRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private CreateRecommendationHandler CreateHandler() => new(_repo, _listRepo, _householdContext, _unitOfWork, _timeProvider);

    public CreateRecommendationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
        _listRepo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_WhenSharedList_CreatesWithNullListId()
    {
        ShoppingListRecommendation? added = null;
        _repo.When(r => r.Add(Arg.Any<ShoppingListRecommendation>())).Do(c => added = c.Arg<ShoppingListRecommendation>());

        var result = await CreateHandler().Handle(new CreateRecommendationCommand("Milk", null), TestContext.Current.CancellationToken);

        Assert.IsType<Created<ShoppingListRecommendation>>(result);
        Assert.NotNull(added);
        Assert.Null(added!.ShoppingListId);
    }

    [Fact]
    public async Task Handle_WhenListBelongsToHousehold_CreatesWithListId()
    {
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 7, HouseholdId = 0, Name = "Groceries" } }.AsAsyncQueryable());
        ShoppingListRecommendation? added = null;
        _repo.When(r => r.Add(Arg.Any<ShoppingListRecommendation>())).Do(c => added = c.Arg<ShoppingListRecommendation>());

        var result = await CreateHandler().Handle(new CreateRecommendationCommand("Milk", null, ShoppingListId: 7), TestContext.Current.CancellationToken);

        Assert.IsType<Created<ShoppingListRecommendation>>(result);
        Assert.Equal(7, added!.ShoppingListId);
    }

    [Fact]
    public async Task Handle_WhenListNotInHousehold_ReturnsNotFound()
    {
        var result = await CreateHandler().Handle(new CreateRecommendationCommand("Milk", null, ShoppingListId: 999), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
        _repo.DidNotReceive().Add(Arg.Any<ShoppingListRecommendation>());
    }
}

public class UpdateRecommendationHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IRepository<ShoppingList> _listRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private UpdateRecommendationHandler CreateHandler() => new(_repo, _listRepo, _householdContext, _unitOfWork, _timeProvider);

    public UpdateRecommendationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
        _listRepo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new UpdateRecommendationCommand(1, "New", null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndPreferredUnit()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Old" };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new UpdateRecommendationCommand(1, "New", "kg", null), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal("kg", entity.PreferredUnit);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UpdatesIncludeInSuggestions()
    {
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Boneless chicken breasts", IncludeInSuggestions = false };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateRecommendationCommand(1, "Boneless chicken breasts", null, 5, IncludeInSuggestions: true),
            TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.True(entity.IncludeInSuggestions);
        Assert.Equal(5, entity.CategoryId);
    }

    [Fact]
    public async Task Handle_AssignsListId_WhenListBelongsToHousehold()
    {
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Milk" };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { entity }.AsAsyncQueryable());
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 7, HouseholdId = 0, Name = "Groceries" } }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateRecommendationCommand(1, "Milk", null, null, IncludeInSuggestions: true, ShoppingListId: 7),
            TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(7, entity.ShoppingListId);
    }

    [Fact]
    public async Task Handle_WhenListNotInHousehold_ReturnsNotFound()
    {
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Milk" };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateRecommendationCommand(1, "Milk", null, null, IncludeInSuggestions: true, ShoppingListId: 999),
            TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }
}

public class DeleteRecommendationHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private DeleteRecommendationHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork);

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_RemovesAndReturnsNoContent()
    {
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Sugar" };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _repo.Received(1).Remove(entity);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteRecommendationsForListHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IRepository<ShoppingList> _listRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private DeleteRecommendationsForListHandler CreateHandler() => new(_repo, _listRepo, _householdContext, _unitOfWork);

    [Fact]
    public async Task Handle_WhenListNotInHousehold_ReturnsNotFound()
    {
        _listRepo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteRecommendationsForListCommand(7), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
        _repo.DidNotReceive().Remove(Arg.Any<ShoppingListRecommendation>());
    }

    [Fact]
    public async Task Handle_RemovesOnlyThatListsOwnSuggestions()
    {
        _listRepo.Query().Returns(new List<ShoppingList> { new() { Id = 7, HouseholdId = 0, Name = "Groceries" } }.AsAsyncQueryable());
        var ownA = new ShoppingListRecommendation { Id = 1, Name = "Milk", ShoppingListId = 7 };
        var ownB = new ShoppingListRecommendation { Id = 2, Name = "Eggs", ShoppingListId = 7 };
        var shared = new ShoppingListRecommendation { Id = 3, Name = "Bread", ShoppingListId = null };
        var otherList = new ShoppingListRecommendation { Id = 4, Name = "Nails", ShoppingListId = 9 };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { ownA, ownB, shared, otherList }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteRecommendationsForListCommand(7), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _repo.Received(1).Remove(ownA);
        _repo.Received(1).Remove(ownB);
        _repo.DidNotReceive().Remove(shared);
        _repo.DidNotReceive().Remove(otherList);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetAllRecommendationsHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsAllItems()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Bread" },
            new() { Id = 2, Name = "Salt" }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext).Handle(new GetAllRecommendationsQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task Handle_WhenSuggestableOnly_ExcludesHidden()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Bread", IncludeInSuggestions = true },
            new() { Id = 2, Name = "Boneless chicken breasts", IncludeInSuggestions = false }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext)
            .Handle(new GetAllRecommendationsQuery(SuggestableOnly: true), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Bread", result[0].Name);
    }

    [Fact]
    public async Task Handle_WhenShoppingListId_ReturnsOwnAndShared()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Own", ShoppingListId = 7 },
            new() { Id = 2, Name = "Shared", ShoppingListId = null },
            new() { Id = 3, Name = "OtherList", ShoppingListId = 9 }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext)
            .Handle(new GetAllRecommendationsQuery(ShoppingListId: 7), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.Count);
        Assert.DoesNotContain(result, r => r.Name == "OtherList");
    }

    [Fact]
    public async Task Handle_WhenSharedOnly_ReturnsOnlyNullListRows()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Own", ShoppingListId = 7 },
            new() { Id = 2, Name = "Shared", ShoppingListId = null }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext)
            .Handle(new GetAllRecommendationsQuery(SharedOnly: true), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Shared", result[0].Name);
    }

    [Fact]
    public async Task Handle_WhenUncategorized_ReturnsOnlyRowsWithoutCategory()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "NoCat", CategoryId = null },
            new() { Id = 2, Name = "HasCat", CategoryId = 3 }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext)
            .Handle(new GetAllRecommendationsQuery(Uncategorized: true), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("NoCat", result[0].Name);
    }

    [Fact]
    public async Task Handle_WhenIncludeInSuggestionsFalse_ReturnsOnlyHidden()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Shown", IncludeInSuggestions = true },
            new() { Id = 2, Name = "Hidden", IncludeInSuggestions = false }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext)
            .Handle(new GetAllRecommendationsQuery(IncludeInSuggestions: false), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Hidden", result[0].Name);
    }
}

public class SearchRecommendationsListScopeTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_BlankSearch_WithShoppingListId_ReturnsOwnAndShared()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Own", ShoppingListId = 7, IncludeInSuggestions = true },
            new() { Id = 2, Name = "Shared", ShoppingListId = null, IncludeInSuggestions = true },
            new() { Id = 3, Name = "OtherList", ShoppingListId = 9, IncludeInSuggestions = true }
        }.AsAsyncQueryable());

        var result = await new SearchRecommendationsHandler(_repo, _householdContext)
            .Handle(new SearchRecommendationsQuery(Search: null, Limit: 20, ShoppingListId: 7), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.Count);
        Assert.DoesNotContain(result, r => r.Name == "OtherList");
    }
}
