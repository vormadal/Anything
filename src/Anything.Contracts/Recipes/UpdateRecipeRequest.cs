using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record UpdateRecipeRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(500, ErrorMessage = "Link must be at most 500 characters.")]
    [Url(ErrorMessage = "Link must be a valid URL.")]
    string? Link,
    [StringLength(5000, ErrorMessage = "Notes must be at most 5000 characters.")]
    string? Notes,
    [Range(1, 10000, ErrorMessage = "Cook time must be between 1 and 10000 minutes.")]
    int? CookTimeMinutes,
    [Range(1, 10000, ErrorMessage = "Servings must be between 1 and 10000.")]
    int? Servings,
    string? ServingsType);
