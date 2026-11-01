namespace Anything.Core.Entities;

/// <summary>
/// The share of a purchase that went to one line: how much of the line's quantity was bought
/// and what part of the purchase total it was charged. Lives and dies with its purchase — it has
/// no soft-delete of its own; readers filter on the purchase's <c>DeletedOn</c>.
/// </summary>
public class RenovationPurchaseAllocation
{
    public int Id { get; set; }
    public int PurchaseId { get; set; }
    public int LineId { get; set; }
    public decimal Quantity { get; set; }
    public decimal Amount { get; set; }
    /// <summary>Set once this allocation has been added to the inventory; guards against adding it twice.</summary>
    public int? InventoryItemId { get; set; }
}
