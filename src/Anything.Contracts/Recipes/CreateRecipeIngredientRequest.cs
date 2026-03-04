using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record CreateRecipeIngredientRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Range(0, double.MaxValue, ErrorMessage = "Amount must be 0 or greater.")]
    decimal? Amount,
    [StringLength(100, ErrorMessage = "Unit must be at most 100 characters.")]
    string? Unit,
    [StringLength(200, ErrorMessage = "Group must be at most 200 characters.")]
    string? Group);
