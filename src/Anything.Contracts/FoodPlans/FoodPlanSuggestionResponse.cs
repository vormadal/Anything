namespace Anything.Contracts.FoodPlans;

public record FoodPlanSuggestionResponse(
    int RecipeId,
    string Name,
    double Score,
    List<string> Reasons,
    DateOnly? LastPlannedOn,
    int TimesPlanned);
