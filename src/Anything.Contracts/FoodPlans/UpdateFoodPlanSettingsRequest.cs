using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpdateFoodPlanSettingsRequest(
    [Range(1, 127, ErrorMessage = "ActiveDays must have at least one day selected (value between 1 and 127).")]
    int ActiveDays = 31,
    [Range(0, 100)]
    int? SuggestionRotationWeight = null,
    [Range(0, 100)]
    int? SuggestionFavoritesWeight = null,
    [Range(0, 100)]
    int? SuggestionSeasonalityWeight = null,
    [Range(0, 60)]
    int? SuggestionExclusionWindowDays = null,
    [Range(1, 365)]
    int? SuggestionRotationSaturationDays = null,
    [Range(0, 182)]
    int? SuggestionSeasonalityWindowDays = null);
