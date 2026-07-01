using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.ShoppingLists;

/// <summary>Saves an existing list as a reusable template. When <c>Name</c> is omitted, the source list's name is used.</summary>
public record SaveAsTemplateRequest(
    [StringLength(200, ErrorMessage = "Name must be at most 200 characters.")]
    string? Name = null);
