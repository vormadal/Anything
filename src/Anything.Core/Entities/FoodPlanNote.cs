namespace Anything.Core.Entities;

public class FoodPlanNote
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public required string Note { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
