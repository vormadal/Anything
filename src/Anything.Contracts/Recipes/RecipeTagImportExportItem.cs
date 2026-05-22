using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record RecipeTagImportExportItem(
    [Required]
    [StringLength(200, MinimumLength = 1)]
    string RecipeName,
    List<string> Tags);
