namespace Anything.Core.Entities;

public class FoodPlanSettings
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    /// <summary>
    /// Bitmask of active days: bit 0 = Monday, bit 1 = Tuesday, ..., bit 6 = Sunday.
    /// Default 31 (0b0011111) = Monday–Friday.
    /// </summary>
    public int ActiveDays { get; set; } = 31;
    public DateTime? CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
