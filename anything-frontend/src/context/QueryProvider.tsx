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
