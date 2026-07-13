"use client";

import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createOfflinePersister,
  shouldPersistQuery,
  OFFLINE_CACHE_BUSTER,
} from "@/lib/offline/persister";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
          // Mutations implement their own offline handling (isOffline()/isNetworkError()
          // checks that queue into the outbox — see useShoppingLists.ts). React Query's
          // default networkMode "online" pauses mutationFn until the browser's online
          // event fires, which would bypass that logic entirely: the mutation would sit
          // paused while offline and only run once back online, when isOffline() already
          // reports false and it goes straight to the network instead of the outbox.
          mutations: {
            networkMode: "always",
          },
        },
      })
  );
  const [persister] = useState(() => createOfflinePersister());

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: OFFLINE_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
      // Restored queries keep their original dataUpdatedAt, so with a 60s
      // staleTime they can read as "fresh" — and skip refetching — for up to
      // a minute after a reload even though the persisted snapshot predates
      // writes made just before the reload (a mutation's cache update can
      // land after the persister's last throttled flush). Invalidating once
      // restore completes forces every query to revalidate against the
      // server instead of trusting a snapshot that may already be stale.
      onSuccess={() => {
        void queryClient.invalidateQueries();
      }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
