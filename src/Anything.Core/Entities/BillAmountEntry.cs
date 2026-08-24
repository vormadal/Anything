namespace Anything.Core.Entities;

/// <summary>
/// Records the actual amount paid for a bill in a given billing period. Distinct from
/// <see cref="BillPriceHistory"/>, which tracks the bill's list/contracted price over
/// time — this tracks what was actually charged, useful for bills with
/// <see cref="Bill.HasVariableAmount"/> set (e.g. utilities).
/// </summary>
public class BillAmountEntry
{
    public int Id { get; set; }
    public int BillId { get; set; }
    public Bill? Bill { get; set; }
    public decimal Amount { get; set; }
    public DateTime PeriodDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
