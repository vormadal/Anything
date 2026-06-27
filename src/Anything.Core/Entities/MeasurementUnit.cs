namespace Anything.Core.Entities;

public class MeasurementUnit
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
