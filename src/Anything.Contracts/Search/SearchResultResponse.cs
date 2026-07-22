namespace Anything.Contracts.Search;

/// <summary>
/// A single cross-entity search hit. <see cref="EntityType"/> (e.g. "Recipe",
/// "ShoppingList", "InventoryItem") tells the client which detail page to route to.
/// </summary>
public record SearchResultResponse(string EntityType, int EntityId, string Title, string? Snippet);
