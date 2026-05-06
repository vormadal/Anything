using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

/// <summary>0 = General, 1 = Shopping</summary>
public record ConvertShoppingListTypeRequest(
    [Range(0, 1, ErrorMessage = "Type must be 0 (General) or 1 (Shopping).")]
    int Type);
