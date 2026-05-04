using Anything.Core.Entities;
using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record CreateShoppingListRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    ListType Type = ListType.Shopping);
