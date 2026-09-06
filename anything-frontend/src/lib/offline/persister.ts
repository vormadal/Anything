import { get, set, del } from "idb-keyval";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/query-persist-client-core";

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

// `createAsyncStoragePersister` defaults to plain `JSON.stringify`/`JSON.parse`,
// which round-trips every `Date` field on every cached entity (modifiedOn,
// createdOn, purchasedOn, ...) into a plain ISO string instead of a `Date`.
// A naive `JSON.stringify` replacer can't fix this by checking
// `value instanceof Date`: `JSON.stringify` calls `Date.prototype.toJSON()`
// (which already returns the ISO string) *before* invoking the replacer, so
// by the time the replacer sees the value it's already a string
// indistinguishable from any other. So dates are marked with `markDates`
// before `JSON.stringify` ever runs, and unmarked with `unmarkDates` after
// `JSON.parse`, restoring real `Date` instances on rehydration — the same
// shape code elsewhere in the app already assumes (e.g.
// `sortMostRecentlyCheckedFirst` calling `.getTime()` on `modifiedOn`).
const DATE_MARKER = "__date__";

function markDates(value: unknown): unknown {
  if (value instanceof Date) {
    return { [DATE_MARKER]: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(markDates);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, markDates(val)])
    );
  }
  return value;
}

function isMarkedDate(value: object): value is { [DATE_MARKER]: string } {
  return DATE_MARKER in value;
}

function unmarkDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(unmarkDates);
  }
  if (value !== null && typeof value === "object") {
    if (isMarkedDate(value)) {
      return new Date(value[DATE_MARKER]);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, unmarkDates(val)])
    );
  }
  return value;
}

export function serializeOfflineCache<T>(client: T): string {
  return JSON.stringify(markDates(client));
}

export function deserializeOfflineCache<T = PersistedClient>(cachedString: string): T {
  return unmarkDates(JSON.parse(cachedString)) as T;
}

export function createOfflinePersister() {
  return createAsyncStoragePersister({
    key: PERSIST_KEY,
    storage: {
      getItem: (key: string) => get(key),
      setItem: (key: string, value: string) => set(key, value),
      removeItem: (key: string) => del(key),
    },
    serialize: serializeOfflineCache,
    deserialize: deserializeOfflineCache,
  });
}
