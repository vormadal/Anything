using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record RenameRecipeTagRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public required string NewName { get; init; }
}
