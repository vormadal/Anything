using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Bills;

public record UpdateBillPriceRequest(
    [Required(ErrorMessage = "Amount is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0.")]
    decimal Amount,
    [Required(ErrorMessage = "Effective date is required.")]
    DateTime EffectiveDate,
    [StringLength(500, ErrorMessage = "Notes must be at most 500 characters.")]
    string? Notes = null);
