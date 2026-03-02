namespace Anything.Contracts.FoodPlans;

public record RecipeMultiplier(int RecipeId, double Multiplier);

public record AddFoodPlanToShoppingListRequest(
    int ShoppingListId,
    IReadOnlyList<RecipeMultiplier>? RecipeMultipliers = null);
