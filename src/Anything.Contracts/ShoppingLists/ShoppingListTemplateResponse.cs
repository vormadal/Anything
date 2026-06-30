namespace Anything.Contracts.ShoppingLists;

/// <summary>A reusable list template. <c>Type</c> is 0 = General, 1 = Shopping; <c>ItemCount</c> is the number of items the template will create.</summary>
public record ShoppingListTemplateResponse(
    int Id,
    string Name,
    int Type,
    int ItemCount,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
