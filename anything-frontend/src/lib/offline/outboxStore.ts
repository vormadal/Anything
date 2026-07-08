"use client";

import { useMemo, useSyncExternalStore } from "react";
import { subscribeOutbox, getPendingItemIdsForList } from "@/lib/offline/outbox";

const EMPTY_IDS: number[] = [];

export function usePendingItemIds(listId: number): Set<number> {
  const ids = useSyncExternalStore(
    subscribeOutbox,
    () => getPendingItemIdsForList(listId),
    () => EMPTY_IDS
  );
  return useMemo(() => new Set(ids), [ids]);
}
