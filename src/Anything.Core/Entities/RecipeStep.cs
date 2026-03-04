namespace Anything.Core.Entities;

public class RecipeStep
{
    public int Id { get; set; }
    public int RecipeId { get; set; }
    public int Order { get; set; }
    public required string Text { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
