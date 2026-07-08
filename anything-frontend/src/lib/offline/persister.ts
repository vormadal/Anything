import { get, set, del } from "idb-keyval";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";

// Bump when the shape of persisted shopping-list/checklist queries changes,
// so stale persisted caches from an older version are discarded rather than rehydrated.
export const OFFLINE_CACHE_BUSTER = "v1";

const PERSIST_KEY = "anything:query-cache:v1";

const PERSISTED_QUERY_KEY_PREFIXES = [
  "shoppingLists",
  "shoppingList",
  "shoppingListItems",
  "shoppingListTemplates",
];

export function shouldPersistQuery(query: Query): boolean {
  const [prefix] = query.queryKey;
  return typeof prefix === "string" && PERSISTED_QUERY_KEY_PREFIXES.includes(prefix);
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
