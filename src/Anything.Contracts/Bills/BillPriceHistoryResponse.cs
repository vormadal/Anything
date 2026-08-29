namespace Anything.Contracts.Bills;

public record BillPriceHistoryResponse(
    int Id,
    int BillId,
    decimal Amount,
    DateTime EffectiveDate,
    DateTime? EndDate,
    string? Notes,
    decimal? PreviousAmount,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
