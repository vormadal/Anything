"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  SearchResultResponse,
  SearchIndexOverviewResponse,
  RebuildSearchIndexResponse,
} from "@/lib/api-client/models/index";

export type { SearchResultResponse, SearchIndexOverviewResponse, RebuildSearchIndexResponse };

const SEARCH_INDEX_OVERVIEW_KEY = ["searchIndexOverview"] as const;

/** Cross-entity search. Pass an already-debounced term; disabled while blank. */
export function useSearch(term: string, limit = 20) {
  const trimmed = term.trim();

  return useQuery({
    queryKey: ["search", trimmed, limit],
    enabled: trimmed.length > 0,
    queryFn: async (): Promise<SearchResultResponse[]> => {
      const results = await apiClient.api.search.get({ queryParameters: { term: trimmed, limit } });
      return results ?? [];
    },
  });
}

/** Household-scoped "is search populated/healthy" summary — counts by entity type, gated to household managers on the backend. */
export function useSearchIndexOverview() {
  return useQuery({
    queryKey: SEARCH_INDEX_OVERVIEW_KEY,
    queryFn: async (): Promise<SearchIndexOverviewResponse> => {
      const overview = await apiClient.api.search.overview.get();
      return overview ?? { totalDocuments: 0, byType: [], lastIndexedOn: null };
    },
  });
}

/** Admin-only: rebuilds the search index for every household. */
export function useRebuildSearchIndex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<RebuildSearchIndexResponse> => {
      const result = await apiClient.api.search.rebuildIndex.post();
      return result ?? { indexed: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_INDEX_OVERVIEW_KEY });
    },
  });
}
