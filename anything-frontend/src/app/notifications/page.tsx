"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Megaphone, Send, Settings, X } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { SendNotificationDialog } from "@/components/SendNotificationDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useHouseholdContext } from "@/context/HouseholdContext";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationResponse,
} from "@/hooks/useNotifications";
import { canManageHousehold } from "@/lib/roles";
import { cn } from "@/lib/utils";

const SETTINGS_LABEL = "Notification settings";
const SEND_LABEL = "Send an announcement";
const SENT_LABEL = "Sent announcements";

function formatWhen(createdOn: Date | null | undefined): string {
  if (!createdOn) return "";
  return formatDistanceToNow(createdOn, { addSuffix: true });
}

function NotificationRow({
  notification,
  onOpen,
  onDismiss,
}: {
  notification: NotificationResponse;
  onOpen: (notification: NotificationResponse) => void;
  onDismiss: (id: number) => void;
}) {
  const isUnread = !notification.readOn;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        isUnread && "bg-blue-50/60 dark:bg-blue-900/10"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex items-center gap-2">
          {isUnread && (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
            />
          )}
          <span
            className={cn(
              "block truncate text-sm text-gray-900 dark:text-white",
              isUnread ? "font-semibold" : "font-medium"
            )}
          >
            {notification.title}
          </span>
        </span>
        {notification.body && (
          <span className="mt-0.5 block text-xs text-gray-600 dark:text-gray-300">
            {notification.body}
          </span>
        )}
        <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
          {formatWhen(notification.createdOn)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDismiss(notification.id ?? 0)}
        aria-label={`Dismiss ${notification.title}`}
        className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { setHeaderActions, setLeftAction } = useHeaderActions();
  const { currentHouseholdRole } = useHouseholdContext();
  const { data: notifications, isLoading, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const [sendOpen, setSendOpen] = useState(false);

  const isManager = canManageHousehold(currentHouseholdRole);

  useEffect(() => {
    setLeftAction({ type: "back", href: "/" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  useEffect(() => {
    setHeaderActions(
      <div className="ml-auto flex items-center gap-1">
        {isManager && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={SEND_LABEL}
              title={SEND_LABEL}
              onClick={() => setSendOpen(true)}
            >
              <Megaphone className="h-5 w-5" />
            </Button>
            {/* Manager-only because only a manager can send. The endpoint
                itself isn't gated — a demoted manager reaching the URL still
                sees their own history rather than a 403. */}
            <Link
              href="/notifications/sent"
              aria-label={SENT_LABEL}
              title={SENT_LABEL}
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <Send className="h-5 w-5" />
            </Link>
          </>
        )}
        <Link
          href="/notifications/settings"
          aria-label={SETTINGS_LABEL}
          title={SETTINGS_LABEL}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>,
      false
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, isManager]);

  const handleOpen = (notification: NotificationResponse) => {
    if (!notification.readOn && notification.id) {
      markRead.mutate(notification.id);
    }
    // linkUrl is always an app-relative path built server-side — the send API
    // has no link field, so this can't be an off-site redirect.
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const hasUnread = notifications?.some((n) => !n.readOn) ?? false;

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
      <PageTitle>Notifications</PageTitle>

      {isLoading && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Failed to load notifications. Please try again later.
        </div>
      )}

      {hasUnread && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      )}

      {notifications?.length === 0 && !isLoading && !error && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          Nothing here yet. You&apos;ll see household updates as they happen.
        </div>
      )}

      {notifications && notifications.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onOpen={handleOpen}
              onDismiss={(id) => deleteNotification.mutate(id)}
            />
          ))}
        </div>
      )}

      <SendNotificationDialog open={sendOpen} onOpenChange={setSendOpen} />
    </div>
  );
}
