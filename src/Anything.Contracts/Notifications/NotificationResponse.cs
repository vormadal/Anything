namespace Anything.Contracts.Notifications;

/// <summary>
/// One notification in the signed-in user's inbox. <paramref name="LinkUrl"/> is
/// always an app-relative path set server-side, never client input.
/// </summary>
public record NotificationResponse(
    int Id,
    string Category,
    string Title,
    string? Body,
    string? LinkUrl,
    DateTime CreatedOn,
    DateTime? ReadOn);
