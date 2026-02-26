namespace Anything.Contracts.Auth;

public record CreateInviteResponse(
    string InviteUrl,
    string Token);
