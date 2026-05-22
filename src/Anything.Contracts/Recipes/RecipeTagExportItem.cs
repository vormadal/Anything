using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record RecipeTagExportItem(
    [Required]
    [StringLength(200, MinimumLength = 1)]
    string RecipeName,
    [Required]
    List<string> Ingredients,
    [Required]
    List<string> Tags);
