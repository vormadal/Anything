namespace Anything.Core.Entities;

public class FoodPlan
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime WeekStart { get; set; }
    /// <summary>
    /// Bitmask of active days: bit 0 = Monday, bit 1 = Tuesday, ..., bit 6 = Sunday.
    /// Default 31 (0b0011111) = Monday–Friday.
    /// </summary>
    public int ActiveDays { get; set; } = 31;
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
