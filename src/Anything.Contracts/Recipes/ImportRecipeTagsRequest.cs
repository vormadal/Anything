using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record ImportRecipeTagsRequest(
    [Required]
    List<RecipeTagImportExportItem> Recipes);
