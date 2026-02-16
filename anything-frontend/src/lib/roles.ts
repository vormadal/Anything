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
