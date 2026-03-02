namespace Anything.Contracts.Recipes;

public record RecipeImageResponse(
    int Id,
    int RecipeId,
    string ThumbnailUrl,
    string MediumUrl,
    string OriginalUrl,
    DateTime CreatedOn);
