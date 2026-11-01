namespace Anything.Core.Entities;

/// <summary>
/// A household-wide material or service with default pricing. Lines copy its price when it is
/// chosen, so changing a default later never silently re-prices an existing line.
/// </summary>
public class RenovationMaterial
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal DefaultPrice { get; set; }
    public decimal WastePercent { get; set; }
    public decimal? PackSize { get; set; }
    public string? ProductUrl { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
