namespace Anything.Contracts.Notifications;

/// <summary>
/// The badge count for the signed-in user in the current household. Counts live,
/// unread notifications only — dismissing one lowers it just as reading it does.
/// </summary>
public record UnreadNotificationCountResponse(int Count);
