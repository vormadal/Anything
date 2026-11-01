namespace Anything.Core.Entities;

/// <summary>
/// One payment (a receipt) that can cover several lines across rooms. The total is split onto
/// the lines as <see cref="RenovationPurchaseAllocation"/> rows.
/// </summary>
public class RenovationPurchase
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int ProjectId { get; set; }
    /// <summary>The free-text vendor name shown to people. When <see cref="VendorId"/> is set it always holds that vendor's name.</summary>
    public string? Vendor { get; set; }
    /// <summary>The household's vendor this purchase was made from, when one was linked.</summary>
    public int? VendorId { get; set; }
    public DateOnly PurchasedOn { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
