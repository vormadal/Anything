namespace Anything.Core.Entities;

/// <summary>
/// A household renovation project: a set of rooms whose budget lines add up to an estimate,
/// tracked against an optional target budget as purchases are recorded.
/// </summary>
public class RenovationProject
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Budget { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
