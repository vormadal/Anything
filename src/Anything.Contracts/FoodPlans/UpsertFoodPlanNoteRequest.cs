using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpsertFoodPlanNoteRequest(
    [Required(ErrorMessage = "Note is required.")]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Note must be between 1 and 500 characters.")]
    string Note);
