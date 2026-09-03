"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";

type SyncEvent =
  | { type: "shoppingLists" }
  | { type: "shoppingListTemplates" }
  | { type: "shoppingListItems"; listId: number };

const SSE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

// How long to wait before minting a fresh ticket and reconnecting after the
// stream drops. EventSource's own built-in auto-retry is deliberately
// suppressed (see the onerror handler below) — it would keep retrying the
// same URL, but a ticket is single-use, so that stale URL can never succeed
// again. We take over reconnection ourselves instead.
const RECONNECT_DELAY_MS = 5000;

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
    let source: EventSource | null = null;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // The first onopen is the initial connection — the persister's onSuccess
    // already invalidates the cache on a cold start, so skip it here to avoid a
    // redundant refetch. Every later onopen is a reconnect after a dropped
    // connection, where we must catch events missed while disconnected.
    let isFirstConnect = true;

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, RECONNECT_DELAY_MS);
    };

    // EventSource can't set an Authorization header, so it authenticates via a
    // short-lived, single-use ticket instead of the real access token — see
    // SseTicketService on the backend. Minting one is an ordinary
    // apiClient call (Authorization + X-Household-Id attached automatically),
    // so it's done fresh on every connect/reconnect rather than once at mount.
    const connect = async () => {
      if (cancelled || !getAccessToken()) return;

      let ticket: string | null | undefined;
      try {
        ticket = (await apiClient.api.events.ticket.post())?.ticket;
      } catch {
        // Not authenticated, no active household yet, or offline — retry later.
        scheduleReconnect();
        return;
      }
      if (cancelled || !ticket) return;

      const url = `${SSE_URL}/api/events?ticket=${encodeURIComponent(ticket)}`;
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

      es.onerror = () => {
        es.close();
        scheduleReconnect();
      };

      source = es;
    };

    void connect();

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
        void connect();
      }
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
      source?.close();
    };
  }, [queryClient]);
}
