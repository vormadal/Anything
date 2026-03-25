"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { FoodPlanEntry, FoodPlanNote, FoodPlanSettings } from "@/lib/api-client/models/index";

export function useFoodPlanSettings() {
  return useQuery({
    queryKey: ["foodPlanSettings"],
    queryFn: () => apiClient.api.foodPlan.settings.get() as Promise<FoodPlanSettings>,
  });
}

export function useUpdateFoodPlanSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: { activeDays: number }) =>
      apiClient.api.foodPlan.settings.put({ activeDays: settings.activeDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanSettings"] });
    },
  });
}

export function useFoodPlanEntries(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["foodPlanEntries", startDate, endDate],
    queryFn: () =>
      apiClient.api.foodPlan.entries.get({
        queryParameters: { startDate: new Date(startDate), endDate: new Date(endDate) },
      }) as Promise<FoodPlanEntry[]>,
    enabled: !!startDate && !!endDate,
  });
}

export function useAddFoodPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: {
      name: string;
      recipeId?: number | null;
      date: Date;
    }) =>
      apiClient.api.foodPlan.entries.post({
        name: entry.name,
        recipeId: entry.recipeId,
        date: entry.date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanEntries"] });
    },
  });
}

export function useUpdateFoodPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      name,
      recipeId,
      date,
    }: {
      entryId: number;
      name: string;
      recipeId?: number | null;
      date: Date;
    }) =>
      apiClient.api.foodPlan.entries.byEntryId(entryId).put({
        name,
        recipeId,
        date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanEntries"] });
    },
  });
}

export function useDeleteFoodPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: number) =>
      apiClient.api.foodPlan.entries.byEntryId(entryId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanEntries"] });
    },
  });
}

export function useAddFoodPlanToShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shoppingListId,
      startDate,
      endDate,
      recipeMultipliers,
    }: {
      shoppingListId: number;
      startDate: Date;
      endDate: Date;
      recipeMultipliers?: { recipeId: number; multiplier: number }[];
    }) =>
      apiClient.api.foodPlan.addToShoppingList.post({
        shoppingListId,
        startDate,
        endDate,
        recipeMultipliers,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanEntries"] });
    },
  });
}

export function useFoodPlanNotes(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["foodPlanNotes", startDate, endDate],
    queryFn: () =>
      apiClient.api.foodPlan.notes.get({
        queryParameters: { startDate: new Date(startDate), endDate: new Date(endDate) },
      }) as Promise<FoodPlanNote[]>,
    enabled: !!startDate && !!endDate,
  });
}

export function useUpsertFoodPlanNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) =>
      apiClient.api.foodPlan.notes.byDate(date).put({ note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanNotes"] });
    },
  });
}

export function useDeleteFoodPlanNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: number) =>
      apiClient.api.foodPlan.notes.byNoteId(noteId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanNotes"] });
    },
  });
}
