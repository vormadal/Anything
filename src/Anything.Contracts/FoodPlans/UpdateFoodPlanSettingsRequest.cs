using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpdateFoodPlanSettingsRequest(
    [Range(1, 127, ErrorMessage = "ActiveDays must have at least one day selected (value between 1 and 127).")]
    int ActiveDays = 31);
