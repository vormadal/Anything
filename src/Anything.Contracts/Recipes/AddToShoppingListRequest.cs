namespace Anything.Contracts.Recipes;

public record AddToShoppingListRequest(
    int ShoppingListId,
    double Multiplier = 1.0);
