using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record CreateShoppingListFromTemplateRequest(
    [Range(1, int.MaxValue, ErrorMessage = "A valid template id is required.")]
    int TemplateId,
    [StringLength(200, ErrorMessage = "Name must be at most 200 characters.")]
    string? Name = null);
