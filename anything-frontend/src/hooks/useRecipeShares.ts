"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

export type ShareExpiry = "OneWeek" | "OneMonth" | "Forever";

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

export function useRecipeShares(recipeId: number) {
  return useQuery({
    queryKey: ["recipeShares", recipeId],
    queryFn: async (): Promise<RecipeShareResponse[]> => {
      const res = await apiFetch(`/api/recipes/${recipeId}/shares`);
      if (!res.ok) throw new Error("Failed to load shares");
      return res.json();
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
      const res = await apiFetch(`/api/recipes/${recipeId}/shares`, {
        method: "POST",
        body: JSON.stringify({ expiry: data.expiry, targetEmail: data.targetEmail ?? null }),
      });
      if (!res.ok) throw new Error("Failed to create share link");
      return res.json();
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
      const res = await apiFetch(`/api/recipes/${recipeId}/shares/${tokenId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke share link");
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
      const res = await fetch(`${API_BASE_URL}/api/shared/recipes/${token}`);
      if (!res.ok) throw new Error("Share link not found");
      return res.json();
    },
    retry: false,
  });
}

export function useCloneSharedRecipe(token: string) {
  return useMutation({
    mutationFn: async (targetHouseholdId: number): Promise<{ id: number }> => {
      const res = await apiFetch(`/api/shared/recipes/${token}/clone`, {
        method: "POST",
        body: JSON.stringify({ targetHouseholdId }),
      });
      if (!res.ok) {
        const status = res.status;
        if (status === 403) throw new Error("You are not authorized to clone this recipe.");
        if (status === 410) throw new Error("This share link has expired.");
        throw new Error("Failed to clone recipe");
      }
      return res.json();
    },
  });
}
