namespace Anything.Contracts.Bills;

public record BillPriceHistoryResponse(
    int Id,
    int BillId,
    decimal Amount,
    DateTime EffectiveDate,
    string? Notes,
    decimal? PreviousAmount,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
