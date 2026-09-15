"use client";

import { useEffect } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Switch } from "@/components/ui/switch";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotifications";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  notificationCategoryDescription,
  notificationCategoryLabel,
} from "@/lib/notifications";

export default function NotificationSettingsPage() {
  const { setLeftAction } = useHeaderActions();
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    setLeftAction({ type: "back", href: "/notifications" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  // The update is partial, so one toggle sends one entry. No local mirror of
  // the list is needed: React Query invalidates and re-renders from the server,
  // which is also the only place that knows the full set of categories.
  const handleToggle = (category: string, inAppEnabled: boolean) => {
    updatePreferences.mutate([{ category, inAppEnabled }]);
  };

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

              return (
                <div
                  key={category}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    {description && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {description}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={preference.inAppEnabled ?? true}
                    onCheckedChange={(checked) => handleToggle(category, checked)}
                    disabled={!isOnline}
                    aria-label={label}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
