using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record AddRecipeImageRequest(
    [Required, Url] string Url);
