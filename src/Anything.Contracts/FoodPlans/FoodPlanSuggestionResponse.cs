namespace Anything.Contracts.FoodPlans;

/// <summary>
/// A ranked recipe suggestion for a food plan day. <paramref name="Reasons"/> is ordered
/// with the primary reason first; <paramref name="LastPlannedOn"/> is null for recipes
/// that have never been planned.
/// </summary>
public record FoodPlanSuggestionResponse(
    int RecipeId,
    string Name,
    double Score,
    List<string> Reasons,
    DateOnly? LastPlannedOn,
    int TimesPlanned);
