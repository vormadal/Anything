using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Auth;

public record RefreshTokenRequest(
    [Required(ErrorMessage = "Token is required.")]
    string RefreshToken);
