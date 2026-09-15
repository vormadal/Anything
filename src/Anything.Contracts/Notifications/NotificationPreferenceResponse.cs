namespace Anything.Contracts.Notifications;

/// <summary>
/// One category's setting for the signed-in user. The list endpoint always
/// returns every known category in its canonical order, whether or not the user
/// has ever changed it, so a client never has to know that an unsaved category
/// means enabled.
/// <para>
/// <paramref name="PushEnabled"/> narrows <paramref name="InAppEnabled"/>: with
/// in-app off nothing is created, so nothing can be pushed regardless.
/// </para>
/// </summary>
public record NotificationPreferenceResponse(string Category, bool InAppEnabled, bool PushEnabled);
