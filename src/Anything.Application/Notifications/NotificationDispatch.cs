namespace Anything.Application.Notifications;

/// <summary>
/// One notification to fan out. Recipients are resolved and filtered by the
/// dispatcher, so callers describe <em>what happened</em>, not who ends up with
/// a row.
/// </summary>
public sealed record NotificationDispatch
{
    public required int HouseholdId { get; init; }

    /// <summary>One of <c>NotificationCategories</c> — decides whose opt-out applies.</summary>
    public required string Category { get; init; }

    public required string Title { get; init; }
    public string? Body { get; init; }

    /// <summary>
    /// App-relative path the notification links to (e.g. <c>/bills/12</c>).
    /// Always a literal built by the calling handler — never forwarded from a
    /// request body.
    /// </summary>
    public string? LinkUrl { get; init; }

    /// <summary>
    /// Stable identity of the underlying event. Set it for anything that can be
    /// produced more than once (a scheduled sweep, a retried job) to make
    /// dispatch idempotent; leave it null for genuine one-offs.
    /// </summary>
    public string? SourceKey { get; init; }

    /// <summary>Who caused the event; null for system-generated notifications.</summary>
    public int? CreatedByUserId { get; init; }

    /// <summary>
    /// Explicit recipients. Null means every member of <see cref="HouseholdId"/>.
    /// </summary>
    public IReadOnlyCollection<int>? RecipientUserIds { get; init; }

    /// <summary>
    /// A recipient to drop — normally the actor, who does not need telling about
    /// their own action.
    /// </summary>
    public int? ExcludeUserId { get; init; }
}
