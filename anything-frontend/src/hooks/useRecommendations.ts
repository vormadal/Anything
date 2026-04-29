"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiFetch } from "@/lib/apiClient";
import type { ShoppingListRecommendation } from "@/lib/api-client/models/index";

type RecommendationExportItem = { name: string; preferredUnit?: string | null; category?: string | null };
type RecommendationExportData = { recommendations: RecommendationExportItem[] };

export function useApprovedRecommendations() {
  return useQuery({
    queryKey: ["shoppingListRecommendations", "approved"],
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.get() as Promise<ShoppingListRecommendation[]>,
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

export function usePendingRecommendations() {
  return useQuery({
    queryKey: ["shoppingListRecommendations", "pending"],
    queryFn: () =>
      apiClient.api.shoppingListRecommendations.pending.get() as Promise<ShoppingListRecommendation[]>,
  });
}

export function useApproveRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.shoppingListRecommendations.byId(id).approve.post(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
    },
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
    mutationFn: ({ id, name, preferredUnit, categoryId }: { id: number; name: string; preferredUnit?: string | null; categoryId?: number | null }) =>
      apiClient.api.shoppingListRecommendations.byId(id).put({ name, preferredUnit: preferredUnit ?? null, categoryId: categoryId ?? null }),
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
    mutationFn: async ({ uncategorizedOnly }: { uncategorizedOnly: boolean }) => {
      const path = uncategorizedOnly
        ? "/api/shopping-list-recommendations/export?uncategorizedOnly=true"
        : "/api/shopping-list-recommendations/export";
      const response = await apiFetch(path);
      if (!response.ok) throw new Error("Export failed");
      const data = await response.json() as RecommendationExportData;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = uncategorizedOnly ? "recommendations-uncategorized.json" : "recommendations.json";
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
}

export function useImportRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecommendationExportData) => {
      const response = await apiFetch("/api/shopping-list-recommendations/import", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Import failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}
