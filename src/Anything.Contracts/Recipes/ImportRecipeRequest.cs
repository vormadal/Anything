using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record ImportRecipeIngredientRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    decimal Amount,
    [StringLength(100, ErrorMessage = "Unit must be at most 100 characters.")]
    string? Unit,
    [StringLength(200, ErrorMessage = "Group must be at most 200 characters.")]
    string? Group);

public record ImportRecipeStepRequest(
    [Required(ErrorMessage = "Text is required.")]
    [StringLength(5000, MinimumLength = 1, ErrorMessage = "Text must be between 1 and 5000 characters.")]
    string Text,
    int Order);

public record ImportRecipeRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Url(ErrorMessage = "Link must be a valid URL.")]
    string? Link,
    [StringLength(5000, ErrorMessage = "Notes must be at most 5000 characters.")]
    string? Notes,
    List<ImportRecipeIngredientRequest>? Ingredients,
    List<ImportRecipeStepRequest>? Steps);
