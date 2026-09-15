namespace Anything.Application.Notifications;

/// <summary>
/// One notification's worth of push work, handed to the background sender.
/// Carries only what the payload needs — the sender resolves devices itself, so
/// a queued item stays valid even if the user registers another browser between
/// dispatch and delivery.
/// </summary>
public sealed record PushDispatch
{
    public required IReadOnlyCollection<int> UserIds { get; init; }
    public required string Title { get; init; }
    public string? Body { get; init; }

    /// <summary>App-relative path the notification opens, if any.</summary>
    public string? LinkUrl { get; init; }
}
