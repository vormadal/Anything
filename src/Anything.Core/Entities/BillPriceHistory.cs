namespace Anything.Core.Entities;

public class BillPriceHistory
{
    public int Id { get; set; }
    public int BillId { get; set; }
    public Bill? Bill { get; set; }
    public decimal Amount { get; set; }
    public DateTime EffectiveDate { get; set; }

    /// <summary>
    /// Optional end of this price's validity period. Null means the price is still
    /// in effect (or the bill has no end-dated pricing).
    /// </summary>
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
