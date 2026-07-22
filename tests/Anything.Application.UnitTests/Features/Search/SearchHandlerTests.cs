using Anything.Application.Features.Search.Commands;
using Anything.Application.Features.Search.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
using Anything.Core.Services;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Search;

public class GetSearchResultsHandlerTests
{
    private readonly ISearchIndexService _searchIndexService = Substitute.For<ISearchIndexService>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public GetSearchResultsHandlerTests()
    {
        _householdContext.HouseholdId.Returns(5);
    }

    private GetSearchResultsHandler CreateHandler() => new(_searchIndexService, _householdContext);

    [Fact]
    public async Task Handle_WhenTermBlank_ReturnsEmptyWithoutQuerying()
    {
        var result = await CreateHandler().Handle(new GetSearchResultsQuery("   "), TestContext.Current.CancellationToken);

        Assert.Empty(result);
        await _searchIndexService.DidNotReceive()
            .Search(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_MapsHitsToResponses()
    {
        _searchIndexService.Search(5, "chicken", Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(new List<SearchHit> { new(SearchEntityTypes.Recipe, 1, "Chicken Curry", "Chicken Curry, spicy") });

        var result = await CreateHandler().Handle(new GetSearchResultsQuery("chicken"), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal(SearchEntityTypes.Recipe, result[0].EntityType);
        Assert.Equal(1, result[0].EntityId);
        Assert.Equal("Chicken Curry", result[0].Title);
        Assert.Equal("Chicken Curry, spicy", result[0].Snippet);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(500, 50)]
    [InlineData(10, 10)]
    public async Task Handle_ClampsLimit(int requested, int expected)
    {
        _searchIndexService.Search(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(new List<SearchHit>());

        await CreateHandler().Handle(new GetSearchResultsQuery("milk", requested), TestContext.Current.CancellationToken);

        await _searchIndexService.Received(1).Search(5, "milk", expected, Arg.Any<CancellationToken>());
    }
}

public class GetSearchIndexOverviewHandlerTests
{
    private readonly IRepository<SearchDocument> _repo = Substitute.For<IRepository<SearchDocument>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public GetSearchIndexOverviewHandlerTests()
    {
        _householdContext.HouseholdId.Returns(9);
    }

    private GetSearchIndexOverviewHandler CreateHandler() => new(_repo, _householdContext);

    [Fact]
    public async Task Handle_WhenEmpty_ReturnsZeroedOverview()
    {
        _repo.Query().Returns(new List<SearchDocument>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetSearchIndexOverviewQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(0, result.TotalDocuments);
        Assert.Empty(result.ByType);
        Assert.Null(result.LastIndexedOn);
    }

    [Fact]
    public async Task Handle_GroupsCountsByEntityTypeForCurrentHousehold()
    {
        var older = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var newer = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc);
        _repo.Query().Returns(new List<SearchDocument>
        {
            new() { Id = 1, HouseholdId = 9, EntityType = SearchEntityTypes.Recipe, EntityId = 1, Title = "Pasta", Content = "Pasta", ModifiedOn = older },
            new() { Id = 2, HouseholdId = 9, EntityType = SearchEntityTypes.Recipe, EntityId = 2, Title = "Soup", Content = "Soup", ModifiedOn = newer },
            new() { Id = 3, HouseholdId = 9, EntityType = SearchEntityTypes.ShoppingList, EntityId = 3, Title = "Groceries", Content = "Groceries", ModifiedOn = older },
            new() { Id = 4, HouseholdId = 1, EntityType = SearchEntityTypes.Recipe, EntityId = 4, Title = "Other household", Content = "Other household", ModifiedOn = newer },
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetSearchIndexOverviewQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(3, result.TotalDocuments);
        Assert.Equal(2, result.ByType.Single(x => x.EntityType == SearchEntityTypes.Recipe).Count);
        Assert.Equal(1, result.ByType.Single(x => x.EntityType == SearchEntityTypes.ShoppingList).Count);
        Assert.Equal(newer, result.LastIndexedOn);
    }
}

public class RebuildSearchIndexHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<ShoppingList> _shoppingListRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<InventoryItem> _inventoryItemRepo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IRepository<SearchDocument> _searchDocumentRepo = Substitute.For<IRepository<SearchDocument>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    public RebuildSearchIndexHandlerTests()
    {
        _recipeRepo.Query().Returns(new List<Recipe>().AsAsyncQueryable());
        _shoppingListRepo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());
        _inventoryItemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());
        _searchDocumentRepo.Query().Returns(new List<SearchDocument>().AsAsyncQueryable());
    }

    private RebuildSearchIndexHandler CreateHandler() =>
        new(_recipeRepo, _shoppingListRepo, _inventoryItemRepo, _searchDocumentRepo, _unitOfWork);

    [Fact]
    public async Task Handle_CreatesDocumentForEachSearchableEntity()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 9, Name = "Pasta" } }.AsAsyncQueryable());
        _shoppingListRepo.Query().Returns(new List<ShoppingList> { new() { Id = 2, HouseholdId = 9, Name = "Groceries" } }.AsAsyncQueryable());
        _inventoryItemRepo.Query().Returns(new List<InventoryItem> { new() { Id = 3, HouseholdId = 9, Name = "Flour" } }.AsAsyncQueryable());

        var added = new List<SearchDocument>();
        _searchDocumentRepo.When(r => r.Add(Arg.Any<SearchDocument>())).Do(c => added.Add(c.Arg<SearchDocument>()));

        var count = await CreateHandler().Handle(new RebuildSearchIndexCommand(), TestContext.Current.CancellationToken);

        Assert.Equal(3, count);
        Assert.Equal(3, added.Count);
        Assert.Contains(added, d => d.EntityType == SearchEntityTypes.Recipe && d.EntityId == 1 && d.Title == "Pasta");
        Assert.Contains(added, d => d.EntityType == SearchEntityTypes.ShoppingList && d.EntityId == 2 && d.Title == "Groceries");
        Assert.Contains(added, d => d.EntityType == SearchEntityTypes.InventoryItem && d.EntityId == 3 && d.Title == "Flour");
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UpdatesExistingDocumentInPlace()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 9, Name = "New Name" } }.AsAsyncQueryable());
        var existing = new SearchDocument
        {
            Id = 100,
            HouseholdId = 9,
            EntityType = SearchEntityTypes.Recipe,
            EntityId = 1,
            Title = "Old Name",
            Content = "Old Name",
        };
        _searchDocumentRepo.Query().Returns(new List<SearchDocument> { existing }.AsAsyncQueryable());

        await CreateHandler().Handle(new RebuildSearchIndexCommand(), TestContext.Current.CancellationToken);

        Assert.Equal("New Name", existing.Title);
        _searchDocumentRepo.DidNotReceive().Add(Arg.Any<SearchDocument>());
    }

    [Fact]
    public async Task Handle_RemovesOrphanedDocuments()
    {
        var orphan = new SearchDocument
        {
            Id = 100,
            HouseholdId = 9,
            EntityType = SearchEntityTypes.Recipe,
            EntityId = 404,
            Title = "Gone",
            Content = "Gone",
        };
        _searchDocumentRepo.Query().Returns(new List<SearchDocument> { orphan }.AsAsyncQueryable());

        await CreateHandler().Handle(new RebuildSearchIndexCommand(), TestContext.Current.CancellationToken);

        _searchDocumentRepo.Received(1).Remove(orphan);
    }
}
