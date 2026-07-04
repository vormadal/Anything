"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/apiClient";
import type { ShareExpiry } from "@/lib/api-client/models/index";

export type { ShareExpiry };

export interface RecipeShareResponse {
  id: number;
  token: string;
  shareUrl: string;
  targetEmail: string | null;
  expiresAt: string | null;
  createdOn: string;
  isExpired: boolean;
  isClaimed: boolean;
}

export interface SharedIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
  group: string | null;
  sortOrder: number;
}

export interface SharedStep {
  description: string;
  sortOrder: number;
}

export interface SharedRecipeResponse {
  recipeId: number;
  recipeName: string;
  notes: string | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  servingsType: string;
  ingredients: SharedIngredient[];
  steps: SharedStep[];
  tags: string[];
  imageUrls: string[];
  isExpired: boolean;
  isTargeted: boolean;
  targetEmail: string | null;
}

function toRecipeShareResponse(s: {
  id?: number | null;
  token?: string | null;
  shareUrl?: string | null;
  targetEmail?: string | null;
  expiresAt?: Date | null;
  createdOn?: Date | null;
  isExpired?: boolean | null;
  isClaimed?: boolean | null;
}): RecipeShareResponse {
  return {
    id: s.id ?? 0,
    token: s.token ?? "",
    shareUrl: s.shareUrl ?? "",
    targetEmail: s.targetEmail ?? null,
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    createdOn: s.createdOn ? s.createdOn.toISOString() : "",
    isExpired: s.isExpired ?? false,
    isClaimed: s.isClaimed ?? false,
  };
}

export function useRecipeShares(recipeId: number) {
  return useQuery({
    queryKey: ["recipeShares", recipeId],
    queryFn: async (): Promise<RecipeShareResponse[]> => {
      const shares = await apiClient.api.recipes.byId(recipeId).shares.get();
      return (shares ?? []).map(toRecipeShareResponse);
    },
  });
}

export function useCreateRecipeShare(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      expiry: ShareExpiry;
      targetEmail?: string | null;
    }): Promise<RecipeShareResponse> => {
      const share = await apiClient.api.recipes.byId(recipeId).shares.post({
        expiry: data.expiry,
        targetEmail: data.targetEmail ?? null,
      });
      if (!share) throw new Error("Failed to create share link");
      return toRecipeShareResponse(share);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recipeShares", recipeId] });
    },
  });
}

export function useRevokeRecipeShare(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: number): Promise<void> => {
      await apiClient.api.recipes.byId(recipeId).shares.byTokenId(tokenId).delete();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recipeShares", recipeId] });
    },
  });
}

export function useSharedRecipe(token: string) {
  return useQuery({
    queryKey: ["sharedRecipe", token],
    queryFn: async (): Promise<SharedRecipeResponse> => {
      const data = await apiClient.api.shared.recipes.byToken(token).get();
      if (!data) throw new Error("Share link not found");
      return {
        recipeId: data.recipeId ?? 0,
        recipeName: data.recipeName ?? "",
        notes: data.notes ?? null,
        cookTimeMinutes: data.cookTimeMinutes ?? null,
        servings: data.servings ?? null,
        servingsType: data.servingsType ?? "",
        ingredients: (data.ingredients ?? []).map((i) => ({
          name: i.name ?? "",
          amount: i.amount ?? null,
          unit: i.unit ?? null,
          group: i.group ?? null,
          sortOrder: i.sortOrder ?? 0,
        })),
        steps: (data.steps ?? []).map((s) => ({
          description: s.description ?? "",
          sortOrder: s.sortOrder ?? 0,
        })),
        tags: data.tags ?? [],
        imageUrls: data.imageUrls ?? [],
        isExpired: data.isExpired ?? false,
        isTargeted: data.isTargeted ?? false,
        targetEmail: data.targetEmail ?? null,
      };
    },
    retry: false,
  });
}

export function useCloneSharedRecipe(token: string) {
  return useMutation({
    mutationFn: async (targetHouseholdId: number): Promise<{ id: number }> => {
      try {
        const recipe = await apiClient.api.shared.recipes.byToken(token).clone.post({
          targetHouseholdId,
        });
        if (!recipe?.id) throw new Error("Failed to clone recipe");
        return { id: recipe.id };
      } catch (err) {
        if (err instanceof ApiError && err.responseStatusCode === 403) {
          throw new Error("You are not authorized to clone this recipe.");
        }
        if (err instanceof ApiError && err.responseStatusCode === 410) {
          throw new Error("This share link has expired.");
        }
        throw new Error("Failed to clone recipe");
      }
    },
  });
}
