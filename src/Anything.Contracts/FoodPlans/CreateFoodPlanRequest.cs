using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record CreateFoodPlanRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Required(ErrorMessage = "WeekStart is required.")]
    DateTime WeekStart,
    [Range(1, 127, ErrorMessage = "ActiveDays must have at least one day selected (value between 1 and 127).")]
    int ActiveDays = 31,
    bool AutoRenew = false);
