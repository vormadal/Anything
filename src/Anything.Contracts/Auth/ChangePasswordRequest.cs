using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Auth;

public record ChangePasswordRequest(
    [Required(ErrorMessage = "Current password is required.")]
    string CurrentPassword,
    [Required(ErrorMessage = "New password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "New password must be at least 8 characters.")]
    string NewPassword);
