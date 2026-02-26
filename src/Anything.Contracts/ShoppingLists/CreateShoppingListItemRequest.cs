using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record CreateShoppingListItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name);
