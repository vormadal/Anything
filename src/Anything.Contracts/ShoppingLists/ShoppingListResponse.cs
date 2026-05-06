namespace Anything.Contracts.ShoppingLists;

public record ShoppingListResponse(
    int Id,
    string Name,
    DateTime CreatedOn,
    DateTime? ModifiedOn,
    DateTime? DeletedOn,
    int UncheckedItemCount,
    int Type);
