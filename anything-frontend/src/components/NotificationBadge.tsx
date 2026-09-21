"use client";

import { cn } from "@/lib/utils";

/**
 * The unread-count pill. Deliberately not a control of its own: it used to hang
 * off a dedicated bell in the global header, which put a notification affordance
 * on every single page for something most visits never act on. It now decorates
 * things that are already there — the burger button and the drawer's
 * Notifications entry — so the count is still one glance away without the header
 * carrying an extra icon.
 *
 * Always `aria-hidden`: the number belongs in the accessible name of whatever it
 * decorates (a badge announced on its own reads as a stray "4"), so every caller
 * is expected to say the count in its own label.
 */
export function NotificationBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[0.625rem] font-semibold text-white",
        className
      )}
    >
      {formatUnreadCount(count)}
    </span>
  );
}

/** Abbreviated so a runaway count can't stretch the burger button or a nav row. */
export function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
