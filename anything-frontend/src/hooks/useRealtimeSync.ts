"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/hooks/useAuth";

type SyncEvent =
  | { type: "shoppingLists" }
  | { type: "shoppingListTemplates" }
  | { type: "shoppingListItems"; listId: number };

const SSE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

// Every shopping-list query key this hook keeps fresh. Invalidating these
// refetches active observers regardless of staleTime, so the open list
// revalidates immediately. Partial keys (e.g. ["shoppingListItems"]) match
// every list id.
const SHOPPING_QUERY_KEYS = [
  ["shoppingLists"],
  ["shoppingListTemplates"],
  ["shoppingList"],
  ["shoppingListItems"],
] as const;

function invalidateShoppingQueries(queryClient: QueryClient) {
  for (const queryKey of SHOPPING_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const url = `${SSE_URL}/api/events?token=${encodeURIComponent(token)}`;
    let source: EventSource | null = null;
    // The first onopen is the initial connection — the persister's onSuccess
    // already invalidates the cache on a cold start, so skip it here to avoid a
    // redundant refetch. Every later onopen is an auto-reconnect after a dropped
    // connection, where we must catch events missed while disconnected.
    let isFirstConnect = true;

    const connect = () => {
      const es = new EventSource(url);

      es.onopen = () => {
        if (isFirstConnect) {
          isFirstConnect = false;
          return;
        }
        invalidateShoppingQueries(queryClient);
      };

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as SyncEvent;
          if (data.type === "shoppingLists") {
            void queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
          } else if (data.type === "shoppingListTemplates") {
            void queryClient.invalidateQueries({
              queryKey: ["shoppingListTemplates"],
            });
          } else if (
            data.type === "shoppingListItems" &&
            data.listId !== undefined
          ) {
            void queryClient.invalidateQueries({
              queryKey: ["shoppingListItems", data.listId],
            });
          }
        } catch {
          // Malformed event — ignore
        }
      };

      source = es;
    };

    connect();

    // Warm resume (PWA/tab brought back to the foreground) does not remount the
    // app, so neither the cache restore nor a mount-time refetch fires. On
    // becoming visible again, revalidate against the server so changes made by
    // other users while the app was backgrounded appear without a manual
    // refresh — and revive the SSE connection if it was dropped while hidden.
    const handleResume = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (navigator.onLine === false) return;

      invalidateShoppingQueries(queryClient);

      if (!source || source.readyState === EventSource.CLOSED) {
        source?.close();
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);

    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
      source?.close();
    };
  }, [queryClient]);
}
