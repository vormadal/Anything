using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

/// <summary>0 = General, 1 = Shopping (default)</summary>
public record CreateShoppingListRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Range(0, 1, ErrorMessage = "Type must be 0 (General) or 1 (Shopping).")]
    int Type = 1,
    bool IsTemplate = false);
