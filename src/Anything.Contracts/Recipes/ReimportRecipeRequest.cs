namespace Anything.Contracts.Recipes;

public record ReimportRecipeRequest(
    bool ImportName,
    bool ImportIngredients,
    bool ImportSteps,
    bool ImportImages);
