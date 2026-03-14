using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record RecipeMultiplier(int RecipeId, double Multiplier);

public record AddFoodPlanToShoppingListRequest(
    [Required(ErrorMessage = "ShoppingListId is required.")]
    int ShoppingListId,
    [Required(ErrorMessage = "StartDate is required.")]
    DateTime StartDate,
    [Required(ErrorMessage = "EndDate is required.")]
    DateTime EndDate,
    IReadOnlyList<RecipeMultiplier>? RecipeMultipliers = null);
