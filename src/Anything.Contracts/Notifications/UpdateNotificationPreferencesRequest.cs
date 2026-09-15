using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Notifications;

/// <summary>
/// One category's desired state. <paramref name="Category"/> must be a known
/// category — an unrecognised one is rejected rather than stored, since a row
/// nothing reads would hide a client/server mismatch.
/// </summary>
public record NotificationPreferenceItem(
    [Required, StringLength(50)] string Category,
    bool InAppEnabled = true);

/// <summary>
/// A partial update: only the categories listed are touched, so a client may
/// send the single toggle the user just flipped rather than the whole set.
/// </summary>
public record UpdateNotificationPreferencesRequest(
    [Required, MinLength(1)] List<NotificationPreferenceItem> Preferences);
