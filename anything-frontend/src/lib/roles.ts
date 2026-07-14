// Check if user is admin
export function isAdmin(userRole: string | undefined): boolean {
  return userRole === "Admin";
}

// Household-level roles (a user's role within a specific household)
export const HOUSEHOLD_ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
} as const;

// Owner and Admin are "managers" — allowed to edit household config
// (tags, suggestions, units, recommendations) and manage members.
export function canManageHousehold(householdRole: string | undefined): boolean {
  return (
    householdRole === HOUSEHOLD_ROLES.OWNER ||
    householdRole === HOUSEHOLD_ROLES.ADMIN
  );
}

// Only the Owner can change member roles, transfer ownership, or delete the household.
export function isHouseholdOwner(householdRole: string | undefined): boolean {
  return householdRole === HOUSEHOLD_ROLES.OWNER;
}
