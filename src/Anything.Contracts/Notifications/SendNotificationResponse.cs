namespace Anything.Contracts.Notifications;

/// <summary>
/// <paramref name="Recipients"/> counts notifications actually created — members
/// who switched the category off are not included.
/// </summary>
public record SendNotificationResponse(int Recipients);
