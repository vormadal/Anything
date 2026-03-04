namespace Anything.Contracts.Auth;

public record InviteResponse(
    int Id,
    string Email,
    DateTime ExpiresAt,
    DateTime CreatedOn,
    bool IsUsed,
    bool IsExpired);
