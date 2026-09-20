"use client";

import { BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * This device's push subscription. Separate from the per-category switches
 * below it because it answers a different question: those decide *what* you'd
 * be notified about, this decides whether *this browser* gets woken at all.
 */
export function PushNotificationCard() {
  const { status, isBusy, enable, disable } = usePushSubscription();
  const isOnline = useOnlineStatus();

  // Nothing to offer and nothing the user can do about it — a disabled control
  // explaining a server-side configuration gap is just noise on the page.
  if (status === "loading" || status === "unavailable") return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Notifications on this device
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {describe(status)}
          </p>
        </div>

        {status === "on" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void disable()}
            disabled={isBusy || !isOnline}
          >
            <BellOff className="mr-1.5 h-4 w-4" />
            Turn off
          </Button>
        )}

        {status === "off" && (
          <Button
            size="sm"
            onClick={() => void enable()}
            disabled={isBusy || !isOnline}
            title={isOnline ? undefined : "Turning on notifications requires an internet connection"}
          >
            <BellRing className="mr-1.5 h-4 w-4" />
            {isBusy ? "Turning on..." : "Turn on"}
          </Button>
        )}
      </div>
    </div>
  );
}

function describe(status: "unsupported" | "denied" | "off" | "on"): string {
  switch (status) {
    case "on":
      return "This device will be notified even when the app isn't open.";
    case "denied":
      // The prompt can't be shown again once blocked — only browser settings
      // can undo it, so say that rather than offering a button that no-ops.
      return "Notifications are blocked for this site. You'll need to allow them in your browser settings.";
    case "unsupported":
      return "This browser can't show notifications. On iPhone and iPad, add the app to your home screen first.";
    default:
      return "Get notified even when the app isn't open. Only affects this device.";
  }
}
