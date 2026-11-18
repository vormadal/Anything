using Anything.Application.Features.ShoppingLists;
using Xunit;

namespace Anything.Application.UnitTests.Features.ShoppingLists;

public class ItemSuggestionRankerTests
{
    private static readonly DateTime Now = new(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);

    private static ItemSuggestionCandidate Candidate(int id, string name, string? unit = null, bool listScoped = true, double similarity = 0) =>
        new(id, name, unit, listScoped, similarity);

    private static ItemUsageRow Used(string name, decimal? amount = null, string? unit = null, int daysAgo = 1, bool recipe = false) =>
        new(name, amount, unit, recipe, Now.AddDays(-daysAgo));

    [Fact]
    public void Rank_PrefixMatchBeatsMorePopularSubstringMatch()
    {
        var result = ItemSuggestionRanker.Rank(
            [Candidate(1, "Mince"), Candidate(2, "Almond milk")],
            [Used("Almond milk"), Used("Almond milk"), Used("Almond milk")],
            [], "min", 10);

        Assert.Equal(new[] { "Mince", "Almond milk" }, result.Select(r => r.Name));
    }

    [Fact]
    public void Rank_WithinSameTier_OrdersByTimesAdded()
    {
        var result = ItemSuggestionRanker.Rank(
            [Candidate(1, "Milk"), Candidate(2, "Milk chocolate")],
            [Used("Milk chocolate"), Used("Milk chocolate"), Used("Milk")],
            [], "mil", 10);

        Assert.Equal(new[] { "Milk chocolate", "Milk" }, result.Select(r => r.Name));
        Assert.Equal(2, result[0].TimesAdded);
    }

    [Fact]
    public void Rank_ExcludesItemsAlreadyOnList_CaseInsensitive()
    {
        var result = ItemSuggestionRanker.Rank(
            [Candidate(1, "Milk"), Candidate(2, "Bread")],
            [Used("Milk"), Used("Bread")],
            [" milk "], null, 10);

        Assert.Equal(new[] { "Bread" }, result.Select(r => r.Name));
    }

    [Fact]
    public void Rank_BlankSearch_ReturnsOnlyUsedItems_MostPopularFirst()
    {
        var result = ItemSuggestionRanker.Rank(
            [Candidate(1, "Apples"), Candidate(2, "Bread"), Candidate(3, "Never bought")],
            [Used("Apples"), Used("Bread"), Used("Bread")],
            [], "  ", 10);

        Assert.Equal(new[] { "Bread", "Apples" }, result.Select(r => r.Name));
    }

    [Fact]
    public void Rank_DeduplicatesSharedAndListScopedNames_PreferringListScoped()
    {
        var result = ItemSuggestionRanker.Rank(
            [Candidate(1, "Milk", listScoped: false), Candidate(2, "milk", listScoped: true)],
            [],
            [], "milk", 10);

        var single = Assert.Single(result);
        Assert.Equal(2, single.RecommendationId);
    }

    [Fact]
    public void Rank_RespectsLimit()
    {
        var result = ItemSuggestionRanker.Rank(
            [Candidate(1, "Aa"), Candidate(2, "Ab"), Candidate(3, "Ac")],
            [], [], "a", 2);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void Rank_FallsBackToPreferredUnit_WhenNoQuantityHistory()
    {
        var result = ItemSuggestionRanker.Rank(
            [Candidate(1, "Flour", unit: "kg")],
            [Used("Flour")],
            [], "flo", 10);

        Assert.Null(result[0].SuggestedAmount);
        Assert.Equal("kg", result[0].SuggestedUnit);
    }

    [Fact]
    public void SuggestQuantity_PicksMostCommonPair()
    {
        var (amount, unit) = ItemSuggestionRanker.SuggestQuantity(
        [
            Used("Milk", 2, "L", daysAgo: 30),
            Used("Milk", 2, "l", daysAgo: 20),
            Used("Milk", 1, "L", daysAgo: 1),
        ]);

        Assert.Equal(2m, amount);
        Assert.Equal("l", unit); // casing of the most recent row in the winning group
    }

    [Fact]
    public void SuggestQuantity_TieGoesToMostRecent()
    {
        var (amount, _) = ItemSuggestionRanker.SuggestQuantity(
            [Used("Eggs", 6, daysAgo: 10), Used("Eggs", 12, daysAgo: 2)]);

        Assert.Equal(12m, amount);
    }

    [Fact]
    public void SuggestQuantity_IgnoresRecipeRowsAndRowsWithoutQuantity()
    {
        var (amount, unit) = ItemSuggestionRanker.SuggestQuantity(
        [
            Used("Butter", 250, "g", recipe: true),
            Used("Butter", 250, "g", recipe: true),
            Used("Butter"),
            Used("Butter", 1, "pk"),
        ]);

        Assert.Equal(1m, amount);
        Assert.Equal("pk", unit);
    }

    [Fact]
    public void SuggestQuantity_NoRows_ReturnsNulls()
    {
        var (amount, unit) = ItemSuggestionRanker.SuggestQuantity([]);

        Assert.Null(amount);
        Assert.Null(unit);
    }
}
