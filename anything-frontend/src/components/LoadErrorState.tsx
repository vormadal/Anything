"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export interface LoadErrorStateProps {
  /** What couldn't be loaded, as a noun phrase: rendered as "Couldn't load {what}". */
  what: string;
  /** Re-runs the failed query. Omit only where there is genuinely nothing to retry. */
  onRetry?: () => void;
  /** True while a retry is in flight — disables the button and swaps its label. */
  isRetrying?: boolean;
  className?: string;
}

/**
 * Shown in place of a page section or home card whose data failed to load.
 *
 * The state this exists for is the one that used to be invisible: a request
 * that errors (server down, captive portal, flaky mobile connection) leaves
 * React Query with `data === undefined`, which renders identically to a
 * genuinely empty collection — "No notes yet" on a household that has plenty.
 * Never render this alongside an empty state; it replaces it.
 *
 * The browser being fully offline is a different message rather than a
 * different component: `OfflineBanner` already explains the app-wide state,
 * so this only has to say why *this* section is blank.
 */
export function LoadErrorState({ what, onRetry, isRetrying = false, className }: LoadErrorStateProps) {
  const isOnline = useOnlineStatus();

  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-900/20",
        className
      )}
    >
      <p className="flex items-center justify-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        Couldn&apos;t load {what}
      </p>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
        {isOnline
          ? "Something went wrong reaching the server."
          : "You're offline — this will load once you're back online."}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RefreshCw className={cn("mr-1 h-4 w-4", isRetrying && "animate-spin")} aria-hidden="true" />
          {isRetrying ? "Retrying…" : "Try again"}
        </Button>
      )}
    </div>
  );
}
