using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record ReorderShoppingListItemsRequest([Required] List<int> Ids);
