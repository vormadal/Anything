namespace Anything.Contracts.Recipes;

/// <summary>
/// A recipe as shown in the recipe list. Carries the primary image thumbnail
/// and tag names inline so the list page renders each card from a single
/// response instead of firing a per-card image + tag request (N+1).
/// </summary>
public record RecipeListItemResponse(
    int Id,
    string Name,
    string? Link,
    string? Notes,
    int? CookTimeMinutes,
    int? Servings,
    string ServingsType,
    DateTime CreatedOn,
    string? ThumbnailUrl,
    List<string> Tags);
