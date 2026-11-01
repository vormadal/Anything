using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Renovation;

public record CreateRenovationProjectRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be 1–200 characters.")]
    string Name,
    [Range(typeof(decimal), "0", "1000000000", ErrorMessage = "Budget must be between 0 and 1,000,000,000.")]
    decimal? Budget,
    [StringLength(1000, ErrorMessage = "Notes must be 1000 characters or less.")]
    string? Notes);

public record UpdateRenovationProjectRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be 1–200 characters.")]
    string Name,
    [Range(typeof(decimal), "0", "1000000000", ErrorMessage = "Budget must be between 0 and 1,000,000,000.")]
    decimal? Budget,
    [StringLength(1000, ErrorMessage = "Notes must be 1000 characters or less.")]
    string? Notes);
