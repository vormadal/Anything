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
    mutationFn: (ingredient: { name: string; amount?: number | null; unit?: string; group?: string }) =>
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
    mutationFn: ({ ingredientId, name, amount, unit, group }: { ingredientId: number; name: string; amount?: number | null; unit?: string | null; group?: string | null }) =>
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

export function useReorderRecipeIngredients(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/ingredients/reorder`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids }),
        }
      );
      if (!response.ok) throw new Error(`Failed to reorder ingredients: ${response.status}`);
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["recipeIngredients", recipeId] });
      const previous = queryClient.getQueryData<RecipeIngredient[]>(["recipeIngredients", recipeId]);
      queryClient.setQueryData<RecipeIngredient[]>(
        ["recipeIngredients", recipeId],
        (old) => {
          if (!old) return old;
          return ids.map((id) => old.find((i) => i.id === id)).filter(Boolean) as RecipeIngredient[];
        }
      );
      return { previous };
    },
    onError: (_err, _ids, context) => {
      queryClient.setQueryData(["recipeIngredients", recipeId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", recipeId] });
    },
  });
}

export function useReorderRecipeSteps(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/steps/reorder`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids }),
        }
      );
      if (!response.ok) throw new Error(`Failed to reorder steps: ${response.status}`);
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["recipeSteps", recipeId] });
      const previous = queryClient.getQueryData<RecipeStep[]>(["recipeSteps", recipeId]);
      queryClient.setQueryData<RecipeStep[]>(
        ["recipeSteps", recipeId],
        (old) => {
          if (!old) return old;
          return ids.map((id) => old.find((s) => s.id === id)).filter(Boolean) as RecipeStep[];
        }
      );
      return { previous };
    },
    onError: (_err, _ids, context) => {
      queryClient.setQueryData(["recipeSteps", recipeId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeSteps", recipeId] });
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

export interface ParsedIngredient {
  amount?: number | null;
  unit?: string | null;
  name: string;
}

export interface ParsedStep {
  order: number;
  text: string;
}

export interface ParsedRecipeResponse {
  name: string;
  link?: string | null;
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
  imageUrl?: string | null;
}

export function useParseRecipeFromUrl() {
  return useMutation({
    mutationFn: async (url: string): Promise<ParsedRecipeResponse> => {
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(`${API_BASE_URL}/api/recipes/parse-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const err = new Error(
          (await response.text()) || `Error ${response.status}`
        ) as Error & { status: number };
        err.status = response.status;
        throw err;
      }
      return response.json() as Promise<ParsedRecipeResponse>;
    },
  });
}

export interface ImportRecipePayload {
  name: string;
  link?: string | null;
  notes?: string | null;
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
  imageUrl?: string | null;
}

export function useImportRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ImportRecipePayload): Promise<{ id: number }> => {
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(`${API_BASE_URL}/api/recipes/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: payload.name,
          link: payload.link ?? null,
          notes: payload.notes ?? null,
          ingredients: payload.ingredients.map((i) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit ?? null,
            group: null,
          })),
          steps: payload.steps.map((s) => ({
            text: s.text,
            order: s.order,
          })),
          imageUrl: payload.imageUrl ?? null,
        }),
      });
      if (!response.ok) {
        const err = new Error(
          (await response.text()) || `Error ${response.status}`
        ) as Error & { status: number };
        err.status = response.status;
        throw err;
      }
      return response.json() as Promise<{ id: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function useUploadRecipeImage(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(
          `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("accessToken") ?? "")
        : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/images/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("File is too large. Please use an image under 10 MB.");
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error("You are not authorised to upload images.");
        }
        throw new Error(`Upload failed (${response.status}). Please try again.`);
      }
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

export interface RecipeTag {
  id: number;
  recipeId: number;
  name: string;
  createdOn: string;
}

export function useRecipeTags(recipeId: number) {
  return useQuery({
    queryKey: ["recipeTags", recipeId],
    queryFn: async (): Promise<RecipeTag[]> => {
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/tags`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(`Failed to fetch tags: ${response.status}`);
      return response.json() as Promise<RecipeTag[]>;
    },
    enabled: recipeId > 0,
  });
}

export function useAddRecipeTag(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<RecipeTag> => {
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/tags`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        }
      );
      if (!response.ok) throw new Error(`Failed to add tag: ${response.status}`);
      return response.json() as Promise<RecipeTag>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeTags", recipeId] });
    },
  });
}

export function useDeleteRecipeTag(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: number): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/tags/${tagId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error(`Failed to delete tag: ${response.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeTags", recipeId] });
    },
  });
}
