namespace Anything.Core.Entities;

public class RecipeIngredient
{
    public int Id { get; set; }
    public int RecipeId { get; set; }
    public required string Name { get; set; }
    public decimal? Amount { get; set; }
    public string? Unit { get; set; }
    public string? Group { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
