using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Notifications;

/// <summary>
/// One category's desired state. <paramref name="Category"/> must be a known
/// category — an unrecognised one is rejected rather than stored, since a row
/// nothing reads would hide a client/server mismatch.
/// <para>
/// Both switches are nullable and mean "leave as-is" when omitted. That matters
/// once there is more than one of them: a client flipping the in-app switch
/// must not silently reset the user's push choice to the default.
/// </para>
/// </summary>
public record NotificationPreferenceItem(
    [Required, StringLength(50)] string Category,
    bool? InAppEnabled = null,
    bool? PushEnabled = null);

/// <summary>
/// A partial update: only the categories listed are touched, and within each,
/// only the switches actually supplied.
/// </summary>
public record UpdateNotificationPreferencesRequest(
    [Required, MinLength(1)] List<NotificationPreferenceItem> Preferences);
