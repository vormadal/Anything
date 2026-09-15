namespace Anything.Core.Entities;

/// <summary>
/// A user's opt-out for one notification category in one household. Rows are
/// written only when a user changes something: an absent row means enabled, so
/// a new category reaches everyone without backfilling preferences (the same
/// default-on model as <see cref="HomeCardPreference"/>).
/// </summary>
public class NotificationPreference
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int UserId { get; set; }

    /// <summary>One of <c>NotificationCategories</c>.</summary>
    public required string Category { get; set; }

    /// <summary>
    /// Whether the notification is created at all. Off means no row is written,
    /// so nothing can be pushed either — <see cref="PushEnabled"/> is strictly a
    /// narrowing of this, never a way around it.
    /// </summary>
    public bool InAppEnabled { get; set; } = true;

    /// <summary>
    /// Whether an in-app notification also wakes the user's devices via Web
    /// Push. Default-on like the rest, so turning push on for the household is
    /// one browser opt-in rather than a settings tour.
    /// </summary>
    public bool PushEnabled { get; set; } = true;
    public DateTime? CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
