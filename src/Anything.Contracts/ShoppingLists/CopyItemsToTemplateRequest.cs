using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record CopyItemsToTemplateRequest([Required] List<int> ItemIds);
