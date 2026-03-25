using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpdateFoodPlanEntryRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    int? RecipeId,
    [Required(ErrorMessage = "Date is required.")]
    DateTime? Date,
    [StringLength(500, ErrorMessage = "Comment must be at most 500 characters.")]
    string? Comment);
