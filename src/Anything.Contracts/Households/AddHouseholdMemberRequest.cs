using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Households;

public record AddHouseholdMemberRequest(
    [Required(ErrorMessage = "UserId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "UserId must be greater than 0.")]
    int UserId,
    [Required(ErrorMessage = "Role is required.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Role must be between 1 and 50 characters.")]
    string Role);
