"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  SuggestionCategory,
  ExportSuggestionCategoriesResponse,
  ImportSuggestionCategoriesRequest,
} from "@/lib/api-client/models/index";

export type { ExportSuggestionCategoriesResponse, ImportSuggestionCategoriesRequest };

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
      const data = await apiClient.api.suggestionCategories.exportEscaped.get();
      if (!data) throw new Error("Export failed");
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
    mutationFn: async (data: ImportSuggestionCategoriesRequest) => {
      await apiClient.api.suggestionCategories.importEscaped.post(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}
