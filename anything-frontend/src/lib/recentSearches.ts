/**
 * Device-local history of global searches, newest first. Stored in
 * localStorage only — never synced — so it is per browser, not per account,
 * and is cleared on logout (see `clearTokens`) so a shared device doesn't leak
 * one user's searches to the next.
 *
 * Every storage access is wrapped: private windows and blocked site data can
 * throw, and search must keep working without history.
 */
export const RECENT_SEARCHES_KEY = "recentSearches";
export const MAX_RECENT_SEARCHES = 8;

const listeners = new Set<() => void>();
const EMPTY: readonly string[] = [];
// Cached so useSyncExternalStore gets a stable reference between changes.
let cachedRaw: string | null = null;
let cachedList: readonly string[] = EMPTY;

function readRaw(): string | null {
  try {
    return localStorage.getItem(RECENT_SEARCHES_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getRecentSearches(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

function write(list: readonly string[]): void {
  try {
    if (list.length === 0) localStorage.removeItem(RECENT_SEARCHES_KEY);
    else localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable — history is a convenience, so drop it silently.
  }
  listeners.forEach((listener) => listener());
}

/** Moves `term` to the top (case-insensitive de-dupe) and caps the list. */
export function addRecentSearch(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const lower = trimmed.toLowerCase();
  const rest = getRecentSearches().filter((t) => t.toLowerCase() !== lower);
  write([trimmed, ...rest].slice(0, MAX_RECENT_SEARCHES));
}

export function removeRecentSearch(term: string): void {
  write(getRecentSearches().filter((t) => t !== term));
}

export function clearRecentSearches(): void {
  write(EMPTY);
}

/**
 * Recent searches matching what is being typed: everything when `query` is
 * blank, otherwise entries containing it — minus an exact match, which would
 * just repeat the input.
 */
export function filterRecentSearches(list: readonly string[], query: string): readonly string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((t) => {
    const lower = t.toLowerCase();
    return lower !== needle && lower.includes(needle);
  });
}

export function subscribeRecentSearches(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other tabs in step too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === RECENT_SEARCHES_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
