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

    public bool InAppEnabled { get; set; } = true;
    public DateTime? CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
