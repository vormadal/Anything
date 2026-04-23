"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiFetch } from "@/lib/apiClient";
import type { SuggestionCategory } from "@/lib/api-client/models/index";

type CategoryExportData = { categories: Array<{ name: string }> };

export function useSuggestionCategories() {
  return useQuery({
    queryKey: ["suggestionCategories"],
    queryFn: () =>
      apiClient.api.suggestionCategories.get() as Promise<SuggestionCategory[]>,
  });
}

export function useCreateSuggestionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiClient.api.suggestionCategories.post({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}

export function useUpdateSuggestionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiClient.api.suggestionCategories.byId(id).put({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}

export function useDeleteSuggestionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.api.suggestionCategories.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}

export function useReorderSuggestionCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.api.suggestionCategories.reorder.put({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}

export function useExportSuggestionCategories() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/suggestion-categories/export");
      if (!response.ok) throw new Error("Export failed");
      const data = await response.json() as CategoryExportData;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "suggestion-categories.json";
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportSuggestionCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryExportData) => {
      const response = await apiFetch("/api/suggestion-categories/import", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Import failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}
