namespace Anything.Core.Entities;

public class RecipeShareToken
{
    public int Id { get; set; }
    public int RecipeId { get; set; }
    public required string Token { get; set; }
    public string? TargetEmail { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedOn { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime? ClaimedOn { get; set; }
    public Recipe? Recipe { get; set; }
}
