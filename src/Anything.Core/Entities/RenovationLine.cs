namespace Anything.Core.Entities;

/// <summary>
/// One budget line in a room — "Floor: Oak laminate", "Plumber". Its required quantity is
/// derived from the room's size via <see cref="Basis"/>, so resizing a room re-prices it.
/// What was actually paid lives in <see cref="RenovationPurchaseAllocation"/> rows, never here.
/// </summary>
public class RenovationLine
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int RoomId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public int? MaterialId { get; set; }
    /// <summary>The material's name at the time it was chosen, or free text.</summary>
    public string Description { get; set; } = string.Empty;
    public RenovationQuantityBasis Basis { get; set; }
    public decimal? FixedQuantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal WastePercent { get; set; }
    /// <summary>Set when the line is done even though less than the required quantity was bought.</summary>
    public bool IsComplete { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
