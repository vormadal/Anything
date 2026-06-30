using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

public record SaveAsTemplateRequest(
    [StringLength(200, ErrorMessage = "Name must be at most 200 characters.")]
    string? Name = null);
