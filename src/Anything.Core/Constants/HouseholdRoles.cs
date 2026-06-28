namespace Anything.Core.Constants;

public static class HouseholdRoles
{
    public const string Owner = "Owner";
    public const string Admin = "Admin";
    public const string Member = "Member";

    public static readonly IReadOnlySet<string> ManagerRoles = new HashSet<string> { Owner, Admin };

    public static bool IsManager(string? role) => role is not null && ManagerRoles.Contains(role);
}
