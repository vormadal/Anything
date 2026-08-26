using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Bills;

public record UpdateBillRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    int? VendorId,
    [Required(ErrorMessage = "Frequency is required.")]
    string Frequency,
    bool IsAutomated,
    int? LocationId,
    [StringLength(500, ErrorMessage = "Management URL must be at most 500 characters.")]
    string? ManagementUrl = null,
    [StringLength(100, ErrorMessage = "Category must be at most 100 characters.")]
    string? Category = null,
    [StringLength(1000, ErrorMessage = "Notes must be at most 1000 characters.")]
    string? Notes = null,
    bool IsRecurring = false);
