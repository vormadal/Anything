namespace Anything.Core.Entities;

public class FoodPlanEntry
{
    public int Id { get; set; }
    public int FoodPlanId { get; set; }
    public int? RecipeId { get; set; }
    public required string Name { get; set; }
    public int DayOfWeek { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
