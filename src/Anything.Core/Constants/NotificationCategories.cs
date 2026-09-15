namespace Anything.Core.Constants;

public static class NotificationCategories
{
    /// <summary>A household manager's message to the household.</summary>
    public const string Announcement = "announcement";

    /// <summary>Membership changes — someone joined the household.</summary>
    public const string HouseholdMember = "householdmember";

    /// <summary>
    /// Every category a user can switch off, in the order the settings page
    /// shows them. Categories are default-on (see
    /// <see cref="Entities.NotificationPreference"/>), so adding one here turns
    /// it on for existing users too.
    /// Note: <c>NotificationEndpointTests</c> asserts this exact list.
    /// </summary>
    public static readonly IReadOnlyList<string> All = [Announcement, HouseholdMember];

    public static bool IsKnown(string? category) =>
        category is not null && All.Contains(category);
}
