using Anything.Application.Features.ShoppingLists.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.ShoppingLists;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Caching.Memory;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.ShoppingLists;

/// <summary>
/// Covers the blank-query path (the "usuals"), which needs no pg_trgm and so runs against the
/// in-memory queryable. The typed-query path is covered by the integration tests.
/// </summary>
public sealed class GetItemSuggestionsHandlerTests : IDisposable
{
    private const int ListId = 1;
    private static readonly DateTime Now = new(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);

    private readonly IRepository<ShoppingList> _listRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IRepository<ShoppingListRecommendation> _recommendationRepo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());
    private readonly List<ShoppingListItem> _items = [];

    public GetItemSuggestionsHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(Now));
        _listRepo.Query().Returns(_ => new List<ShoppingList>
        {
            new() { Id = ListId, Name = "Groceries", Type = ListType.Shopping },
        }.AsAsyncQueryable());
        _itemRepo.Query().Returns(_ => _items.ToList().AsAsyncQueryable());
        _recommendationRepo.Query().Returns(_ => new List<ShoppingListRecommendation>
        {
            new() { Id = 10, Name = "Milk", ShoppingListId = ListId },
            new() { Id = 11, Name = "Bread", ShoppingListId = ListId },
        }.AsAsyncQueryable());
    }

    public void Dispose() => _cache.Dispose();

    private GetItemSuggestionsHandler CreateHandler() =>
        new(_listRepo, _itemRepo, _recommendationRepo, _householdContext, _timeProvider, _cache);

    private void AddHistory(string name, DateTime createdOn, DateTime? completedOn) =>
        _items.Add(new ShoppingListItem
        {
            Id = _items.Count + 1,
            ShoppingListId = ListId,
            Name = name,
            CreatedOn = createdOn,
            CompletedOn = completedOn,
        });

    private async Task<List<ItemSuggestionResponse>> GetUsuals()
    {
        var result = await CreateHandler().Handle(new GetItemSuggestionsQuery(ListId), TestContext.Current.CancellationToken);
        return Assert.IsType<Ok<List<ItemSuggestionResponse>>>(result).Value!;
    }

    [Fact]
    public async Task Handle_OnlyCountsItemsAddedInTheLastThreeMonths()
    {
        AddHistory("Milk", Now.AddMonths(-2), Now.AddMonths(-2));
        AddHistory("Bread", Now.AddMonths(-4), Now.AddMonths(-4));

        var usuals = await GetUsuals();

        Assert.Equal(new[] { "Milk" }, usuals.Select(u => u.Name));
    }

    [Fact]
    public async Task Handle_CachesUsageHistory_AcrossRequests()
    {
        AddHistory("Milk", Now.AddDays(-7), Now.AddDays(-7));

        await GetUsuals();
        // History written after the cache was filled is not seen until it expires...
        AddHistory("Bread", Now.AddDays(-1), Now.AddDays(-1));
        var second = await GetUsuals();

        Assert.Equal(new[] { "Milk" }, second.Select(u => u.Name));
        Assert.True(_cache.TryGetValue(GetItemSuggestionsHandler.UsageCacheKey(ListId), out _));
    }

    [Fact]
    public async Task Handle_ItemsOnTheList_AreExcludedEvenWhenUsageIsCached()
    {
        AddHistory("Milk", Now.AddDays(-7), Now.AddDays(-7));
        Assert.Single(await GetUsuals());

        // ...but what is currently on the list is read live, so an item just added disappears at once.
        AddHistory("Milk", Now, completedOn: null);

        Assert.Empty(await GetUsuals());
    }
}
