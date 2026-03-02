"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { Recipe, RecipeIngredient, RecipeStep, RecipeImage } from "@/lib/api-client/models/index";

export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiClient.api.recipes.get() as Promise<Recipe[]>,
  });
}

export function useRecipe(id: number) {
  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => apiClient.api.recipes.byId(id).get() as Promise<Recipe>,
    enabled: id > 0,
  });
}

export function useRecipeIngredients(recipeId: number) {
  return useQuery({
    queryKey: ["recipeIngredients", recipeId],
    queryFn: () =>
      apiClient.api.recipes.byId(recipeId).ingredients.get() as Promise<RecipeIngredient[]>,
    enabled: recipeId > 0,
  });
}

export function useRecipeSteps(recipeId: number) {
  return useQuery({
    queryKey: ["recipeSteps", recipeId],
    queryFn: () =>
      apiClient.api.recipes.byId(recipeId).steps.get() as Promise<RecipeStep[]>,
    enabled: recipeId > 0,
  });
}

export function useRecipeImages(recipeId: number) {
  return useQuery({
    queryKey: ["recipeImages", recipeId],
    queryFn: () =>
      apiClient.api.recipes.byId(recipeId).images.get() as Promise<RecipeImage[]>,
    enabled: recipeId > 0,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipe: { name: string; link?: string; notes?: string }) =>
      apiClient.api.recipes.post({ name: recipe.name, link: recipe.link, notes: recipe.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, link, notes }: { id: number; name: string; link?: string | null; notes?: string | null }) =>
      apiClient.api.recipes.byId(id).put({ name, link, notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipe", variables.id] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.api.recipes.byId(id).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useAddRecipeIngredient(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredient: { name: string; amount: number; unit?: string; group?: string }) =>
      apiClient.api.recipes.byId(recipeId).ingredients.post({
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        group: ingredient.group,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", recipeId] });
    },
  });
}

export function useUpdateRecipeIngredient(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ingredientId, name, amount, unit, group }: { ingredientId: number; name: string; amount: number; unit?: string | null; group?: string | null }) =>
      apiClient.api.recipes.byId(recipeId).ingredients.byId(ingredientId).put({ name, amount, unit, group }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", recipeId] });
    },
  });
}

export function useDeleteRecipeIngredient(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredientId: number) =>
      apiClient.api.recipes.byId(recipeId).ingredients.byId(ingredientId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", recipeId] });
    },
  });
}

export function useAddRecipeStep(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ text, order }: { text: string; order: number }) =>
      apiClient.api.recipes.byId(recipeId).steps.post({ text, order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeSteps", recipeId] });
    },
  });
}

export function useUpdateRecipeStep(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepId, text, order }: { stepId: number; text: string; order: number }) =>
      apiClient.api.recipes.byId(recipeId).steps.byId(stepId).put({ text, order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeSteps", recipeId] });
    },
  });
}

export function useDeleteRecipeStep(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stepId: number) =>
      apiClient.api.recipes.byId(recipeId).steps.byId(stepId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeSteps", recipeId] });
    },
  });
}

const UPLOAD_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

export function useUploadRecipeImage(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("accessToken") ?? "")
        : "";
      const response = await fetch(
        `${UPLOAD_API_BASE_URL}/api/recipes/${recipeId}/images/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeImages", recipeId] });
    },
  });
}

export function useDeleteRecipeImage(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: number) =>
      apiClient.api.recipes.byId(recipeId).images.byId(imageId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeImages", recipeId] });
    },
  });
}

export function useAddIngredientsToShoppingList(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shoppingListId, multiplier }: { shoppingListId: number; multiplier?: number }) =>
      apiClient.api.recipes.byId(recipeId).addToShoppingList.post({ shoppingListId, multiplier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingLists"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingListItems"] });
    },
  });
}
