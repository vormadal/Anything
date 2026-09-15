namespace Anything.Contracts.Notifications;

/// <summary>
/// What a browser needs before it can subscribe. <paramref name="Enabled"/> is
/// false on a deployment with no VAPID keys — the client hides the push option
/// entirely rather than offering a subscribe button that cannot work.
/// </summary>
public record PushConfigResponse(bool Enabled, string? PublicKey);
