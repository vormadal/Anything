namespace Anything.Contracts.Auth;

public record PendingInviteResponse(
    int Id,
    string Token,
    string Email,
    int? HouseholdId,
    string? HouseholdName,
    DateTime ExpiresAt,
    string InviteUrl);
