"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  ShoppingListRecommendation,
  ExportRecommendationsResponse,
  ImportRecommendationsRequest,
  DuplicateRecommendationGroup,
  MergeRecommendationsRequest,
} from "@/lib/api-client/models/index";

export type {
  ExportRecommendationsResponse,
  ImportRecommendationsRequest,
  DuplicateRecommendationGroup,
  MergeRecommendationsRequest,
};

export function useRecommendations() {
  return useQuery({
    queryKey: ["shoppingListRecommendations"],
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.get() as Promise<ShoppingListRecommendation[]>,
  });
}

/**
 * Ranked, typo-tolerant recommendation search backed by the server so the full
 * recommendation list is never loaded client-side just to filter it. Disabled
 * until there is a non-blank query.
 *
 * When `shoppingListId` is given, the typeahead is scoped to that list's own
 * suggestions plus the household's shared (all-list) ones.
 */
export function useRecommendationSearch(query: string, shoppingListId?: number) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["shoppingListRecommendations", "search", trimmed, shoppingListId ?? null],
    enabled: trimmed.length > 0,
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.search.get({
        queryParameters: { query: trimmed, ...(shoppingListId !== undefined ? { shoppingListId } : {}) },
      }) as Promise<ShoppingListRecommendation[]>,
  });
}

export interface RecommendationFilters {
  categoryId?: number;
  shoppingListId?: number;
  sharedOnly?: boolean;
  uncategorized?: boolean;
  includeInSuggestions?: boolean;
}

export function useAllRecommendations(filters: RecommendationFilters = {}) {
  const { categoryId, shoppingListId, sharedOnly, uncategorized, includeInSuggestions } = filters;
  const hasFilters =
    categoryId !== undefined ||
    shoppingListId !== undefined ||
    sharedOnly !== undefined ||
    uncategorized !== undefined ||
    includeInSuggestions !== undefined;

  return useQuery({
    queryKey: ["shoppingListRecommendations", "all", categoryId ?? null, shoppingListId ?? null, sharedOnly ?? null, uncategorized ?? null, includeInSuggestions ?? null],
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.all.get(
        hasFilters
          ? {
              queryParameters: {
                ...(categoryId !== undefined ? { categoryId } : {}),
                ...(shoppingListId !== undefined ? { shoppingListId } : {}),
                ...(sharedOnly !== undefined ? { sharedOnly } : {}),
                ...(uncategorized !== undefined ? { uncategorized } : {}),
                ...(includeInSuggestions !== undefined ? { includeInSuggestions } : {}),
              },
            }
          : undefined
      ) as Promise<ShoppingListRecommendation[]>,
  });
}

export function useUncategorizedRecommendations() {
  return useQuery({
    queryKey: ["shoppingListRecommendations", "uncategorized"],
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.uncategorized.get() as Promise<ShoppingListRecommendation[]>,
  });
}

/**
 * Scans the household's suggestions for near-duplicate names (typos, plurals)
 * and returns them clustered into groups so a manager can merge each group.
 */
export function useFindDuplicateRecommendations() {
  return useQuery({
    queryKey: ["shoppingListRecommendations", "duplicates"],
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.duplicates.get() as Promise<DuplicateRecommendationGroup[]>,
  });
}

/**
 * Merges one or more duplicate suggestions into a single canonical one: the
 * target is kept (optionally renamed / recategorised) and the sources are removed.
 */
export function useMergeRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: MergeRecommendationsRequest) =>
      apiClient.api.shoppingListRecommendations.merge.post(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
    },
  });
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, preferredUnit, shoppingListId }: { name: string; preferredUnit?: string | null; shoppingListId?: number | null }) =>
      apiClient.api.shoppingListRecommendations.post({ name, preferredUnit: preferredUnit ?? null, shoppingListId: shoppingListId ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
    },
  });
}

export function useUpdateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, preferredUnit, categoryId, includeInSuggestions = true, shoppingListId }: { id: number; name: string; preferredUnit?: string | null; categoryId?: number | null; includeInSuggestions?: boolean; shoppingListId?: number | null }) =>
      apiClient.api.shoppingListRecommendations.byId(id).put({ name, preferredUnit: preferredUnit ?? null, categoryId: categoryId ?? null, includeInSuggestions, shoppingListId: shoppingListId ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.shoppingListRecommendations.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
    },
  });
}

/**
 * Removes every suggestion that belongs specifically to a single list. Shared
 * (all-list) suggestions are left untouched.
 */
export function useDeleteRecommendationsForList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoppingListId: number) =>
      apiClient.api.shoppingListRecommendations.byList.byShoppingListId(shoppingListId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
    },
  });
}

export function useExportRecommendations() {
  return useMutation({
    mutationFn: async ({ uncategorizedOnly = false }: { uncategorizedOnly?: boolean } = {}) => {
      const data = await apiClient.api.shoppingListRecommendations.exportEscaped.get({
        queryParameters: { uncategorizedOnly },
      });
      if (!data) throw new Error("Export failed");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "recommendations.json";
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportRecommendationsRequest) => {
      await apiClient.api.shoppingListRecommendations.importEscaped.post(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}
