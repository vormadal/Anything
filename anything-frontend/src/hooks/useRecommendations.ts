"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { ShoppingListRecommendation } from "@/lib/api-client/models/index";

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
