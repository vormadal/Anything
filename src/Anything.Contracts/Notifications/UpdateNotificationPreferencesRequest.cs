using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Notifications;

public record NotificationPreferenceItem(
    [Required, StringLength(50)] string Category,
    bool InAppEnabled = true);

public record UpdateNotificationPreferencesRequest(
    [Required, MinLength(1)] List<NotificationPreferenceItem> Preferences);
