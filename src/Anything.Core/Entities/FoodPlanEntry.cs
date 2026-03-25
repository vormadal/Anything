namespace Anything.Core.Entities;

public class FoodPlanEntry
{
    public int Id { get; set; }
    public int? RecipeId { get; set; }
    public required string Name { get; set; }
    public string? Comment { get; set; }
    public int DayOfWeek { get; set; }
    public DateTime Date { get; set; }
    public DateTime? AddedToShoppingListOn { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
