"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  ShoppingListRecommendation,
  ExportRecommendationsResponse,
  ImportRecommendationsRequest,
} from "@/lib/api-client/models/index";

export type { ExportRecommendationsResponse, ImportRecommendationsRequest };

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
 */
export function useRecommendationSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["shoppingListRecommendations", "search", trimmed],
    enabled: trimmed.length > 0,
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.search.get({
        queryParameters: { query: trimmed },
      }) as Promise<ShoppingListRecommendation[]>,
  });
}

export function useAllRecommendations(categoryId?: number) {
  return useQuery({
    queryKey: ["shoppingListRecommendations", "all", categoryId],
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.all.get(
        categoryId !== undefined
          ? { queryParameters: { categoryId } }
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

export function useCreateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, preferredUnit }: { name: string; preferredUnit?: string | null }) =>
      apiClient.api.shoppingListRecommendations.post({ name, preferredUnit: preferredUnit ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
    },
  });
}

export function useUpdateRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, preferredUnit, categoryId, includeInSuggestions = true }: { id: number; name: string; preferredUnit?: string | null; categoryId?: number | null; includeInSuggestions?: boolean }) =>
      apiClient.api.shoppingListRecommendations.byId(id).put({ name, preferredUnit: preferredUnit ?? null, categoryId: categoryId ?? null, includeInSuggestions }),
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
