namespace Anything.Contracts.ShoppingLists;

/// <summary>
/// One typeahead suggestion for a shopping list's add box, ranked by match quality and then by
/// how often the item was added to that list in the usage window.
/// </summary>
/// <param name="RecommendationId">The underlying <c>ShoppingListRecommendation</c>.</param>
/// <param name="Name">The item name to add.</param>
/// <param name="SuggestedAmount">The most common amount this item was added with, if any.</param>
/// <param name="SuggestedUnit">The most common unit, falling back to the recommendation's preferred unit.</param>
/// <param name="TimesAdded">How many times the item was added to this list in the usage window.</param>
public record ItemSuggestionResponse(
    int RecommendationId,
    string Name,
    decimal? SuggestedAmount,
    string? SuggestedUnit,
    int TimesAdded);
