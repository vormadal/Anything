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
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
