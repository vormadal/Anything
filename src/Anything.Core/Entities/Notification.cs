namespace Anything.Core.Entities;

/// <summary>
/// One delivered notification for one recipient. Fan-out happens at write time
/// (a household announcement to five members is five rows), so reading an inbox
/// is a single indexed query and marking read never affects anyone else.
/// </summary>
public class Notification
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }

    /// <summary>The recipient. Always a member of <see cref="HouseholdId"/> at dispatch time.</summary>
    public int UserId { get; set; }

    /// <summary>One of <c>NotificationCategories</c> — what the recipient's preferences switch on.</summary>
    public required string Category { get; set; }

    public required string Title { get; set; }
    public string? Body { get; set; }

    /// <summary>
    /// Where clicking the notification goes, as an app-relative path (e.g. <c>/bills/12</c>).
    /// Only ever set server-side — never accepted from a request body, so it can't
    /// carry an off-site redirect or a <c>javascript:</c> URL into the UI.
    /// </summary>
    public string? LinkUrl { get; set; }

    /// <summary>
    /// Stable identity of the real-world thing this notification is about
    /// (e.g. <c>bill:12:2026-09</c>), making dispatch idempotent: a scheduled
    /// sweep that runs twice produces one row. Null for one-off sends, which
    /// should never dedupe — Postgres treats NULLs as distinct in a unique
    /// index, so the index below allows any number of them.
    /// </summary>
    public string? SourceKey { get; set; }

    /// <summary>Who caused it; null for system-generated notifications.</summary>
    public int? CreatedByUserId { get; set; }

    public DateTime CreatedOn { get; set; }
    public DateTime? ReadOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
