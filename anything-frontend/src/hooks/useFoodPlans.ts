"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateOnly } from "@microsoft/kiota-abstractions";
import { apiClient } from "@/lib/apiClient";
import type {
  FoodPlanEntry,
  FoodPlanNote,
  FoodPlanSettings,
  FoodPlanSuggestionResponse,
  SeasonalTagRuleResponse,
} from "@/lib/api-client/models/index";

export type { FoodPlanNote, FoodPlanSuggestionResponse, SeasonalTagRuleResponse };

const SUGGESTIONS_STALE_TIME_MS = 5 * 60 * 1000;

export function useFoodPlanSettings() {
  return useQuery({
    queryKey: ["foodPlanSettings"],
    queryFn: () => apiClient.api.foodPlan.settings.get() as Promise<FoodPlanSettings>,
  });
}

interface UpdateFoodPlanSettingsInput {
  activeDays: number;
  suggestionRotationWeight?: number;
  suggestionFavoritesWeight?: number;
  suggestionSeasonalityWeight?: number;
  suggestionExclusionWindowDays?: number;
  suggestionRotationSaturationDays?: number;
  suggestionSeasonalityWindowDays?: number;
}

export function useUpdateFoodPlanSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateFoodPlanSettingsInput) =>
      apiClient.api.foodPlan.settings.put(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodPlanSettings"] });
      queryClient.invalidateQueries({ queryKey: ["foodPlanSuggestions"] });
    },
  });
}

export function useFoodPlanSuggestions(date: string) {
  return useQuery({
    queryKey: ["foodPlanSuggestions", date],
    queryFn: () =>
      apiClient.api.foodPlan.suggestions.get({
        queryParameters: { date: DateOnly.parse(date) },
      }) as Promise<FoodPlanSuggestionResponse[]>,
    enabled: !!date,
    staleTime: SUGGESTIONS_STALE_TIME_MS,
  });
}

export function useSeasonalTagRules() {
  return useQuery({
    queryKey: ["seasonalTagRules"],
    queryFn: () => apiClient.api.foodPlan.seasonalTags.get() as Promise<SeasonalTagRuleResponse[]>,
  });
}

interface SeasonalTagRuleInput {
  keyword: string;
  matchPrefix: boolean;
  months: number;
  boost: number;
}

export function useCreateSeasonalTagRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: SeasonalTagRuleInput) => apiClient.api.foodPlan.seasonalTags.post(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasonalTagRules"] });
      queryClient.invalidateQueries({ queryKey: ["foodPlanSuggestions"] });
    },
  });
}

export function useUpdateSeasonalTagRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, ...rule }: SeasonalTagRuleInput & { ruleId: number }) =>
      apiClient.api.foodPlan.seasonalTags.byRuleId(ruleId).put(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasonalTagRules"] });
      queryClient.invalidateQueries({ queryKey: ["foodPlanSuggestions"] });
    },
  });
}

export function useDeleteSeasonalTagRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: number) => apiClient.api.foodPlan.seasonalTags.byRuleId(ruleId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasonalTagRules"] });
      queryClient.invalidateQueries({ queryKey: ["foodPlanSuggestions"] });
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
      // Planned entries feed the suggestion exclusion window, so cached suggestions go stale.
      queryClient.invalidateQueries({ queryKey: ["foodPlanSuggestions"] });
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
      queryClient.invalidateQueries({ queryKey: ["foodPlanSuggestions"] });
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
        queryParameters: {
          startDate: DateOnly.parse(startDate),
          endDate: DateOnly.parse(endDate),
        },
      }) as Promise<FoodPlanNote[]>,
    enabled: !!startDate && !!endDate,
  });
}

export function useUpsertFoodPlanNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) =>
      apiClient.api.foodPlan.notes.put(
        { note },
        { queryParameters: { date: DateOnly.parse(date) } }
      ),
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
