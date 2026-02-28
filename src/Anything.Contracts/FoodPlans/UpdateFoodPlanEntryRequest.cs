using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpdateFoodPlanEntryRequest(
    int? RecipeId,
    [StringLength(200, ErrorMessage = "CustomName must be at most 200 characters.")]
    string? CustomName,
    [Range(0, 6, ErrorMessage = "DayOfWeek must be between 0 (Monday) and 6 (Sunday).")]
    int DayOfWeek,
    [StringLength(50, ErrorMessage = "MealType must be at most 50 characters.")]
    string? MealType);
