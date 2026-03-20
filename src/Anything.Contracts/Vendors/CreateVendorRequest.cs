using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Vendors;

public record CreateVendorRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(500, ErrorMessage = "Website must be at most 500 characters.")]
    string? Website = null);
