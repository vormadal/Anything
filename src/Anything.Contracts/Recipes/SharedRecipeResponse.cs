namespace Anything.Contracts.Recipes;

public record SharedRecipeResponse(
    int RecipeId,
    string RecipeName,
    string? Notes,
    int? CookTimeMinutes,
    int? Servings,
    string ServingsType,
    List<SharedIngredientResponse> Ingredients,
    List<SharedStepResponse> Steps,
    List<string> Tags,
    List<string> ImageUrls,
    bool IsExpired,
    bool IsTargeted,
    string? TargetEmail
);

public record SharedIngredientResponse(
    string Name,
    decimal? Amount,
    string? Unit,
    string? Group,
    int SortOrder
);

public record SharedStepResponse(
    string Description,
    int SortOrder
);
