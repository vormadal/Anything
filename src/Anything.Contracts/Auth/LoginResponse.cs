namespace Anything.Contracts.Auth;

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    string Email,
    string Name,
    string Role);
