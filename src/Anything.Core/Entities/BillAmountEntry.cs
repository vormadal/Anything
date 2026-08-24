namespace Anything.Core.Entities;

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
