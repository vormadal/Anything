namespace Anything.Application.Realtime;

public record SyncEvent
{
    public required string Type { get; init; }
    public int? ListId { get; init; }

    public static SyncEvent ShoppingLists() =>
        new() { Type = "shoppingLists" };

    public static SyncEvent ShoppingListTemplates() =>
        new() { Type = "shoppingListTemplates" };

    public static SyncEvent ShoppingListItems(int listId) =>
        new() { Type = "shoppingListItems", ListId = listId };

    /// <summary>
    /// Contentless — it only tells a household's clients to refetch their own
    /// inbox and unread count. No notification content crosses the connection,
    /// which matters because SSE connections are household-scoped, not per-user.
    /// </summary>
    public static SyncEvent Notifications() =>
        new() { Type = "notifications" };
}
