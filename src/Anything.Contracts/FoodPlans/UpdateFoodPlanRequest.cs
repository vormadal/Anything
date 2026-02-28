using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpdateFoodPlanRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Required(ErrorMessage = "WeekStart is required.")]
    DateTime WeekStart);
