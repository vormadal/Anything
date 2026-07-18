namespace Anything.Contracts.Recommendations;

/// <summary>
/// Request to move every suggestion from one scope to another in bulk — e.g. make all
/// shared suggestions specific to a single list. A null list id means the shared scope
/// (suggestions shown in every list).
/// </summary>
/// <param name="FromShoppingListId">Source scope. Null = shared.</param>
/// <param name="ToShoppingListId">Destination scope. Null = shared.</param>
public record TransferRecommendationsRequest(
    int? FromShoppingListId = null,
    int? ToShoppingListId = null);
