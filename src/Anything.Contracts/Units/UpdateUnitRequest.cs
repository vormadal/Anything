using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Units;

public record UpdateUnitRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 50 characters.")]
    string Name);
