"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { FoodPlan, FoodPlanEntry } from "@/lib/api-client/models/index";

export function useFoodPlans() {
  return useQuery({
    queryKey: ["foodPlans"],
    queryFn: () => apiClient.api.foodPlans.get() as Promise<FoodPlan[]>,
  });
}

export function useFoodPlan(id: number) {
  return useQuery({
    queryKey: ["foodPlan", id],
    queryFn: () => apiClient.api.foodPlans.byId(id).get() as Promise<FoodPlan>,
    enabled: id > 0,
  });
}

export function useFoodPlanEntries(foodPlanId: number) {
  return useQuery({
    queryKey: ["foodPlanEntries", foodPlanId],
    queryFn: () =>
      apiClient.api.foodPlans.byId(foodPlanId).entries.get() as Promise<FoodPlanEntry[]>,
    enabled: foodPlanId > 0,
  });
}

export function useCreateFoodPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plan: { name: string; weekStart: Date }) =>
      apiClient.api.foodPlans.post({ name: plan.name, weekStart: plan.weekStart }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlans"] });
    },
  });
}

export function useUpdateFoodPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, weekStart }: { id: number; name: string; weekStart: Date }) =>
      apiClient.api.foodPlans.byId(id).put({ name, weekStart }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["foodPlans"] });
      queryClient.invalidateQueries({ queryKey: ["foodPlan", variables.id] });
    },
  });
}

export function useDeleteFoodPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.foodPlans.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlans"] });
    },
  });
}

export function useAddFoodPlanEntry(foodPlanId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: {
      name: string;
      recipeId?: number | null;
      dayOfWeek: number;
    }) =>
      apiClient.api.foodPlans.byId(foodPlanId).entries.post({
        name: entry.name,
        recipeId: entry.recipeId,
        dayOfWeek: entry.dayOfWeek,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanEntries", foodPlanId] });
    },
  });
}

export function useUpdateFoodPlanEntry(foodPlanId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      name,
      recipeId,
      dayOfWeek,
    }: {
      entryId: number;
      name: string;
      recipeId?: number | null;
      dayOfWeek: number;
    }) =>
      apiClient.api.foodPlans.byId(foodPlanId).entries.byId(entryId).put({
        name,
        recipeId,
        dayOfWeek,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanEntries", foodPlanId] });
    },
  });
}

export function useDeleteFoodPlanEntry(foodPlanId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: number) =>
      apiClient.api.foodPlans.byId(foodPlanId).entries.byId(entryId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanEntries", foodPlanId] });
    },
  });
}

export function useAddFoodPlanToShoppingList(foodPlanId: number) {
  return useMutation({
    mutationFn: (shoppingListId: number) =>
      apiClient.api.foodPlans.byId(foodPlanId).addToShoppingList.post({ shoppingListId }),
  });
}
