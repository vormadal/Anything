namespace Anything.Core.Entities;

/// <summary>
/// A recorded price for a bill, effective over <see cref="EffectiveDate"/>..<see cref="EndDate"/>.
/// This is the sole source for what a bill "currently costs" — <c>BillHelpers.ToBillResponse</c>
/// derives <c>CurrentAmount</c>/<c>MonthlyEquivalent</c> from the latest entry here, and
/// <c>GetBillSummaryQuery</c> sums from here too. There is deliberately no second, separate
/// "amount actually paid" log alongside this one — an earlier <c>BillAmountEntry</c> attempt at
/// that never fed these numbers and read as confusing/redundant rather than intentionally
/// different, so it was removed. Add an entry here whenever the price changes, whether that's a
/// contract renewal or, for a variable bill, just what came in on that period's statement.
/// </summary>
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
