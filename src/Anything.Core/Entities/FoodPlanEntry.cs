namespace Anything.Core.Entities;

public class FoodPlanEntry
{
    public int Id { get; set; }
    public int FoodPlanId { get; set; }
    public int? RecipeId { get; set; }
    public string? CustomName { get; set; }
    public int DayOfWeek { get; set; }
    public string? MealType { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
