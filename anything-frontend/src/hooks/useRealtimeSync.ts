"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/hooks/useAuth";

type SyncEvent =
  | { type: "shoppingLists" }
  | { type: "shoppingListTemplates" }
  | { type: "shoppingListItems"; listId: number };

const SSE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const url = `${SSE_URL}/api/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as SyncEvent;
        if (data.type === "shoppingLists") {
          queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
        } else if (data.type === "shoppingListTemplates") {
          queryClient.invalidateQueries({ queryKey: ["shoppingListTemplates"] });
        } else if (data.type === "shoppingListItems" && data.listId !== undefined) {
          queryClient.invalidateQueries({
            queryKey: ["shoppingListItems", data.listId],
          });
        }
      } catch {
        // Malformed event — ignore
      }
    };

    return () => {
      es.close();
    };
  }, [queryClient]);
}
