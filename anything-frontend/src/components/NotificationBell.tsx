"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";

/**
 * Header entry point to the inbox. A plain link rather than a popover: the app
 * is used mostly on phones, where a dropdown of notifications is worse than the
 * full-page list it would link to anyway — and it keeps the global header clear
 * of Radix layer state (see CLAUDE.md's dismissable-layer gotcha).
 */
export function NotificationBell() {
  const { data: unreadCount } = useUnreadNotificationCount();
  const count = unreadCount ?? 0;
  const hasUnread = count > 0;

  return (
    <Link
      href="/notifications"
      // The count lives in the label, not just the badge, so the control is
      // readable to a screen reader and assertable in tests without depending
      // on the badge's styling.
      aria-label={hasUnread ? `Notifications, ${count} unread` : "Notifications"}
      className="relative ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      <Bell className="h-5 w-5" />
      {hasUnread && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[0.625rem] font-semibold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
