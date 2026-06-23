namespace Anything.Contracts.Recipes;

public record RecipeShareResponse(
    int Id,
    string Token,
    string ShareUrl,
    string? TargetEmail,
    DateTime? ExpiresAt,
    DateTime CreatedOn,
    bool IsExpired,
    bool IsClaimed
);
