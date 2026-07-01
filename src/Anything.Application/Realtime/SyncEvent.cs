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
}
