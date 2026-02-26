using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record UpdateRecipeStepRequest(
    [Required(ErrorMessage = "Text is required.")]
    [StringLength(5000, MinimumLength = 1, ErrorMessage = "Text must be between 1 and 5000 characters.")]
    string Text,
    int Order);
