namespace Anything.Core.Search;

/// <summary>
/// Discriminator values stored in <c>SearchDocument.EntityType</c>, shared
/// between <see cref="ISearchable"/> implementations and search result
/// consumers (the API client uses this string to route a result to the right
/// detail page).
/// </summary>
public static class SearchEntityTypes
{
    public const string Recipe = "Recipe";
    public const string ShoppingList = "ShoppingList";
    public const string InventoryItem = "InventoryItem";
}
