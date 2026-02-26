using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record CreateRecipeImageRequest(
    [Required(ErrorMessage = "Url is required.")]
    [StringLength(1000, MinimumLength = 1, ErrorMessage = "Url must be between 1 and 1000 characters.")]
    [Url(ErrorMessage = "Url must be a valid URL.")]
    string Url);
