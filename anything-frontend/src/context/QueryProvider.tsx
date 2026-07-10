"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
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

  useEffect(() => {
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister: createOfflinePersister(),
      buster: OFFLINE_CACHE_BUSTER,
      dehydrateOptions: {
        shouldDehydrateQuery: shouldPersistQuery,
      },
    });
    return unsubscribe;
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
