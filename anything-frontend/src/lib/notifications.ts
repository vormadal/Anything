/**
 * Display metadata for notification categories. Mirrors
 * `NotificationCategories.All` in `src/Anything.Core/Constants/` — the backend
 * owns the list (and rejects an unknown key on write), this owns how each one
 * reads in the settings page.
 *
 * A category the backend sends that isn't listed here still renders; it just
 * falls back to its raw key, so a server ahead of a cached client degrades
 * rather than breaks.
 */
export const NOTIFICATION_CATEGORIES: Record<string, { label: string; description: string }> = {
  announcement: {
    label: "Announcements",
    description: "Messages sent to the whole household by an owner or admin.",
  },
  householdmember: {
    label: "Household members",
    description: "When someone new joins the household.",
  },
};

export function notificationCategoryLabel(category: string): string {
  return NOTIFICATION_CATEGORIES[category]?.label ?? category;
}

export function notificationCategoryDescription(category: string): string | null {
  return NOTIFICATION_CATEGORIES[category]?.description ?? null;
}
