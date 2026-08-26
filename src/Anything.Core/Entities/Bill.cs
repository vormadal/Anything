namespace Anything.Core.Entities;

public class Bill
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Name { get; set; }
    public int? VendorId { get; set; }
    public PaymentFrequency Frequency { get; set; }
    public bool IsAutomated { get; set; }
    public int? LocationId { get; set; }
    public string? ManagementUrl { get; set; }
    public string? Category { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// Whether this bill recurs on a schedule. When false, <see cref="Frequency"/> is
    /// forced to <see cref="PaymentFrequency.None"/>.
    /// </summary>
    public bool IsRecurring { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
