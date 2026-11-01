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
    public string? Vendor { get; set; }
    public DateOnly PurchasedOn { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
