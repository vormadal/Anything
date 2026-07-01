using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

/// <summary>Creates a new list from an existing template. When <c>Name</c> is omitted, the template's name is used.</summary>
public record CreateShoppingListFromTemplateRequest(
    [Range(1, int.MaxValue, ErrorMessage = "A valid template id is required.")]
    int TemplateId,
    [StringLength(200, ErrorMessage = "Name must be at most 200 characters.")]
    string? Name = null);
