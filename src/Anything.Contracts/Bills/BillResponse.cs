namespace Anything.Contracts.Bills;

public record BillResponse(
    int Id,
    string Name,
    int? VendorId,
    string? VendorName,
    string? VendorWebsite,
    string Frequency,
    bool IsAutomated,
    int? LocationId,
    string? LocationName,
    string? ManagementUrl,
    string? Category,
    string? Notes,
    bool IsRecurring,
    decimal? CurrentAmount,
    decimal? MonthlyEquivalent,
    bool PriceIncreased,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
