using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record ParseRecipeFromUrlRequest(
    [Required(ErrorMessage = "Url is required.")]
    [Url(ErrorMessage = "Url must be a valid URL.")]
    string Url);
