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
    /// forced to <see cref="PaymentFrequency.None"/> and <see cref="HasVariableAmount"/>
    /// is forced to false.
    /// </summary>
    public bool IsRecurring { get; set; }

    /// <summary>
    /// Whether the amount owed varies period to period (e.g. a utility bill). Only
    /// meaningful when <see cref="IsRecurring"/> is true.
    /// </summary>
    public bool HasVariableAmount { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
