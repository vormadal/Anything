using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpdateFoodPlanEntryRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    int? RecipeId,
    [Range(0, 6, ErrorMessage = "DayOfWeek must be between 0 (Monday) and 6 (Sunday).")]
    int DayOfWeek);
