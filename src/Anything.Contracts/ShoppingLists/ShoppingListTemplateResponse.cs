namespace Anything.Contracts.ShoppingLists;

public record ShoppingListTemplateResponse(
    int Id,
    string Name,
    int Type,
    int ItemCount,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
