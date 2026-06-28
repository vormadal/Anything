// User roles
export const USER_ROLES = {
  ADMIN: "Admin",
  USER: "User",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Check if user has a specific role
export function hasRole(userRole: string | undefined, requiredRole: UserRole): boolean {
  return userRole === requiredRole;
}

// Check if user is admin
export function isAdmin(userRole: string | undefined): boolean {
  return hasRole(userRole, USER_ROLES.ADMIN);
}

// Household-level roles (a user's role within a specific household)
export const HOUSEHOLD_ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
} as const;

export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[keyof typeof HOUSEHOLD_ROLES];

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
