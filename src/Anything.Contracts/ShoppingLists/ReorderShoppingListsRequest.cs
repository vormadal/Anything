using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record ReorderShoppingListsRequest([Required] List<int> Ids);
