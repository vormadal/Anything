using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Auth;

public record CreateInviteRequest(
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    string Email);
