using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Households;

public record CreateHouseholdInviteRequest(
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    string Email);
