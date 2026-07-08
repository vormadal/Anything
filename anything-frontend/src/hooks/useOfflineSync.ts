"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { replayOutbox } from "@/lib/offline/replay";

// Mounted once at the app root. Triggers an outbox replay whenever the app
// might have regained connectivity: the browser 'online' event, and the
// foreground/focus events used instead of a Background Sync API (which iOS
// Safari does not support). replayOutbox de-dupes overlapping calls itself.
export function useOfflineSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const trigger = () => {
      void replayOutbox(queryClient);
    };

    trigger();

    window.addEventListener("online", trigger);
    window.addEventListener("focus", trigger);
    document.addEventListener("visibilitychange", trigger);

    return () => {
      window.removeEventListener("online", trigger);
      window.removeEventListener("focus", trigger);
      document.removeEventListener("visibilitychange", trigger);
    };
  }, [queryClient]);
}
