/**
 * Turns one or more React Query results into the "we have nothing to show and
 * it isn't because the data is empty" state that `LoadErrorState` renders.
 *
 * Two distinct failures land here, because they look identical on screen:
 * - **Errored** — the request failed (and exhausted its retries).
 * - **Paused** — the browser went offline before the query ever ran, so
 *   React Query's default `networkMode: "online"` never started it. This is
 *   *not* a loading state (`isLoading` is false, `fetchStatus` is `"paused"`),
 *   so without this check the caller falls straight through to its empty state.
 *
 * Cached data wins over both: a query that has data from the persisted offline
 * cache still has something worth showing, so it is not treated as failed.
 */

/** The subset of a `useQuery` result this needs — keeps callers free of generics. */
export interface LoadableQuery {
  isError: boolean;
  isPaused: boolean;
  isFetching: boolean;
  data: unknown;
  refetch: () => Promise<unknown>;
}

export interface LoadFailure {
  /** True when at least one query has no data to show and none is coming. */
  failed: boolean;
  /** True while a retry (or any refetch) is in flight. */
  isRetrying: boolean;
  /** Re-runs every query passed in. */
  retry: () => void;
}

function hasNothingToShow(query: LoadableQuery): boolean {
  return query.data === undefined && (query.isError || query.isPaused);
}

export function loadFailure(...queries: LoadableQuery[]): LoadFailure {
  return {
    failed: queries.some(hasNothingToShow),
    isRetrying: queries.some((query) => query.isFetching),
    retry: () => {
      queries.forEach((query) => {
        void query.refetch();
      });
    },
  };
}
