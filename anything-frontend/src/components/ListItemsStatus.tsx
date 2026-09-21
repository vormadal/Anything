"use client";

import { LoadErrorState } from "@/components/LoadErrorState";
import { loadFailure, type LoadableQuery } from "@/lib/queryState";

interface Props {
  /**
   * The items query. Loading, failed and offline-paused are all read off it —
   * passing `isLoading`/`error` separately used to lose the paused case, where
   * a cold offline open rendered nothing at all: no loading, no error, and no
   * empty state either, because `items` was `undefined` rather than `[]`.
   */
  query: LoadableQuery & { isLoading: boolean };
  isEmpty: boolean;
}

export function ListItemsStatus({ query, isEmpty }: Props) {
  const load = loadFailure(query);

  if (query.isLoading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (load.failed) {
    return (
      <LoadErrorState
        what="items"
        onRetry={load.retry}
        isRetrying={load.isRetrying}
        className="mb-4"
      />
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        No items yet.
      </div>
    );
  }

  return null;
}
