"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-2 text-sm text-center">
      You&apos;re offline — shopping list and checklist changes will sync when you&apos;re back online.
    </div>
  );
}
