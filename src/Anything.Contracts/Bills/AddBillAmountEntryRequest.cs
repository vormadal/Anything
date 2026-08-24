using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Bills;

public record AddBillAmountEntryRequest(
    [Required(ErrorMessage = "Amount is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0.")]
    decimal Amount,
    [Required(ErrorMessage = "Period date is required.")]
    DateTime PeriodDate,
    [StringLength(500, ErrorMessage = "Notes must be at most 500 characters.")]
    string? Notes = null);
