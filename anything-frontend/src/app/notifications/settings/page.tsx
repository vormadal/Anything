"use client";

import { useEffect } from "react";
import { PageTitle } from "@/components/PageTitle";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { Switch } from "@/components/ui/switch";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotifications";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import {
  notificationCategoryDescription,
  notificationCategoryLabel,
} from "@/lib/notifications";

export default function NotificationSettingsPage() {
  const { setLeftAction } = useHeaderActions();
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const isOnline = useOnlineStatus();
  const { status: pushStatus } = usePushSubscription();

  useEffect(() => {
    setLeftAction({ type: "back", href: "/notifications" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  // The update is partial in both dimensions, so one toggle sends one category
  // with one switch. No local mirror of the list is needed: React Query
  // invalidates and re-renders from the server, which is also the only place
  // that knows the full set of categories.
  const handleToggle = (
    category: string,
    switchName: "inAppEnabled" | "pushEnabled",
    value: boolean
  ) => {
    updatePreferences.mutate([{ category, [switchName]: value }]);
  };

  // The push column is only meaningful once this device is actually
  // subscribed — until then a per-category push switch would be a setting for
  // something that can't happen.
  const showPushColumn = pushStatus === "on";

  return (
    <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
      <PageTitle>Notification settings</PageTitle>

      {isLoading && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Failed to load notification settings. Please try again later.
        </div>
      )}

      <PushNotificationCard />

      {preferences && preferences.length > 0 && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose what shows up in your notifications for this household.
            Turning a category off stops new ones arriving; it doesn&apos;t
            remove what you already have.
          </p>

          <div className="space-y-2">
            {preferences.map((preference) => {
              const category = preference.category ?? "";
              const label = notificationCategoryLabel(category);
              const description = notificationCategoryDescription(category);
              const inAppEnabled = preference.inAppEnabled ?? true;

              return (
                <div
                  key={category}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                      {description && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {description}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={inAppEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle(category, "inAppEnabled", checked)
                      }
                      disabled={!isOnline}
                      aria-label={label}
                    />
                  </div>

                  {showPushColumn && (
                    <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                      <span className="flex-1 text-xs text-gray-500 dark:text-gray-400">
                        Also notify this device
                      </span>
                      <Switch
                        checked={inAppEnabled && (preference.pushEnabled ?? true)}
                        onCheckedChange={(checked) =>
                          handleToggle(category, "pushEnabled", checked)
                        }
                        // Push is a narrowing of in-app: with the category off
                        // there is no notification to push, so offering the
                        // switch would imply otherwise.
                        disabled={!isOnline || !inAppEnabled}
                        aria-label={`Also notify this device about ${label}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
