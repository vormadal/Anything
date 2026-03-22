"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { SuggestionCategory } from "@/lib/api-client/models/index";

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
