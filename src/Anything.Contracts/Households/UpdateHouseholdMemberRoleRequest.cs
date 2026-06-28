using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Households;

public record UpdateHouseholdMemberRoleRequest(
    [Required(ErrorMessage = "Role is required.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Role must be between 1 and 50 characters.")]
    string Role);
