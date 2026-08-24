namespace Anything.Contracts.Bills;

public record BillAmountEntryResponse(
    int Id,
    int BillId,
    decimal Amount,
    DateTime PeriodDate,
    string? Notes,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
