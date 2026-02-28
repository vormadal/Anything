using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record CreateShoppingListItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Range(0.001, double.MaxValue, ErrorMessage = "Amount must be greater than 0.")]
    decimal? Amount = null,
    [StringLength(50, ErrorMessage = "Unit must be at most 50 characters.")]
    string? Unit = null);
