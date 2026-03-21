namespace Anything.Contracts.Bills;

public record BillSummaryResponse(
    int TotalBills,
    decimal TotalMonthlyEquivalent,
    int AutomatedCount,
    int ManualCount,
    decimal TotalCurrentMonthAmount,
    decimal TotalCurrentYearAmount);
