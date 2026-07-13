import { get, set, del } from "idb-keyval";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";

// Bump when the shape of a persisted query changes in a way that would break
// rehydrating an older cache, so stale persisted caches are discarded rather
// than rehydrated.
export const OFFLINE_CACHE_BUSTER = "v1";

const PERSIST_KEY = "anything:query-cache:v1";

// Persist everything by default so a cold, offline app open can still render
// the last-loaded household/recipes/food-plan/bills/etc. instead of a blank
// screen. Excluded: "auth" (auth.user already reads straight from
// localStorage rather than the network, and invite tokens are time-sensitive
// — neither belongs in the general offline cache). Note this only governs
// offline *reads*; writes for anything other than shopping-list/checklist
// items remain online-only (see outbox.ts) and are disabled in the UI while
// offline instead of being queued.
const EXCLUDED_QUERY_KEY_PREFIXES = ["auth"];

export function shouldPersistQuery(query: Query): boolean {
  const [prefix] = query.queryKey;
  return typeof prefix !== "string" || !EXCLUDED_QUERY_KEY_PREFIXES.includes(prefix);
}

export function createOfflinePersister() {
  return createAsyncStoragePersister({
    key: PERSIST_KEY,
    storage: {
      getItem: (key: string) => get(key),
      setItem: (key: string, value: string) => set(key, value),
      removeItem: (key: string) => del(key),
    },
  });
}
