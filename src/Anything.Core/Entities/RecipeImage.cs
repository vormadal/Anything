namespace Anything.Core.Entities;

public class RecipeImage
{
    public int Id { get; set; }
    public int RecipeId { get; set; }
    public required string StorageKey { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
