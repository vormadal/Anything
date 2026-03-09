using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record CreateRecipeTagRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public required string Name { get; init; }
}
