using Anything.Core.Entities;

namespace Anything.Contracts.ShoppingLists;

public record ShoppingListResponse(
    int Id,
    string Name,
    DateTime CreatedOn,
    DateTime? ModifiedOn,
    DateTime? DeletedOn,
    int UncheckedItemCount,
    ListType Type);
