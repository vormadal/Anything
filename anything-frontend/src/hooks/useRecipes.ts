"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, createMultipartBody } from "@/lib/apiClient";
import { getHouseholdHeader } from "@/lib/householdUtils";
import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
  RecipeImageResponse,
  ParsedRecipeResponse,
  ParsedIngredient,
  ParsedStep,
  RecipeTag,
} from "@/lib/api-client/models/index";

// Re-export API model types that consumers import from this hook
export type { ParsedRecipeResponse, ParsedIngredient, ParsedStep, RecipeTag };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5238";

export interface TopTag {
  name: string;
  count: number;
}

export function useRecipes(search?: string, tag?: string) {
  return useQuery({
    queryKey: ["recipes", search ?? "", tag ?? ""],
    queryFn: async (): Promise<Recipe[]> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tag) params.set("tag", tag);
      const qs = params.toString();
      const token =
        typeof globalThis.window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes${qs ? `?${qs}` : ""}`,
        { headers: { Authorization: `Bearer ${token}`, ...getHouseholdHeader() } }
      );
      if (!response.ok) throw new Error(`Failed to fetch recipes: ${response.status}`);
      return response.json() as Promise<Recipe[]>;
    },
  });
}

export function useTopRecipeTags(count = 10) {
  return useQuery({
    queryKey: ["topRecipeTags", count],
    queryFn: async (): Promise<TopTag[]> => {
      const token =
        typeof globalThis.window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/tags?count=${count}`,
        { headers: { Authorization: `Bearer ${token}`, ...getHouseholdHeader() } }
      );
      if (!response.ok) throw new Error(`Failed to fetch top tags: ${response.status}`);
      return response.json() as Promise<TopTag[]>;
    },
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
      apiClient.api.recipes.byId(recipeId).images.get() as Promise<RecipeImageResponse[]>,
    enabled: recipeId > 0,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipe: { name: string; link?: string; notes?: string; cookTimeMinutes?: number | null; servings?: number | null; servingsType?: string | null }) =>
      apiClient.api.recipes.post({
        name: recipe.name,
        link: recipe.link,
        notes: recipe.notes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        servings: recipe.servings,
        servingsType: recipe.servingsType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, link, notes, cookTimeMinutes, servings, servingsType }: { id: number; name: string; link?: string | null; notes?: string | null; cookTimeMinutes?: number | null; servings?: number | null; servingsType?: string | null }) =>
      apiClient.api.recipes.byId(id).put({ name, link, notes, cookTimeMinutes, servings, servingsType }),
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
      apiClient.api.recipes.byId(recipeId).ingredients.byIngredientId(ingredientId).put({ name, amount, unit, group }),
    onMutate: async ({ ingredientId, name, amount, unit, group }) => {
      await queryClient.cancelQueries({ queryKey: ["recipeIngredients", recipeId] });
      const previous = queryClient.getQueryData<RecipeIngredient[]>(["recipeIngredients", recipeId]);
      queryClient.setQueryData<RecipeIngredient[]>(["recipeIngredients", recipeId], (old) => {
        if (!old) return old;
        return old.map((i) =>
          i.id === ingredientId
            ? { ...i, name, amount: amount ?? i.amount, unit: unit !== undefined ? (unit ?? undefined) : i.unit, group: group !== undefined ? (group ?? undefined) : i.group }
            : i
        );
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["recipeIngredients", recipeId], context?.previous);
    },
  });
}

export function useDeleteRecipeIngredient(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ingredientId: number) =>
      apiClient.api.recipes.byId(recipeId).ingredients.byIngredientId(ingredientId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", recipeId] });
    },
  });
}

export function useReorderRecipeIngredients(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]): Promise<void> =>
      apiClient.api.recipes.byId(recipeId).ingredients.reorder.put({ ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["recipeIngredients", recipeId] });
      const previous = queryClient.getQueryData<RecipeIngredient[]>(["recipeIngredients", recipeId]);
      const applyOrder = (old: RecipeIngredient[] | undefined) => {
        if (!old) return old;
        return ids.map((id) => old.find((i) => i.id === id)).filter(Boolean) as RecipeIngredient[];
      };
      queryClient.setQueryData<RecipeIngredient[]>(["recipeIngredients", recipeId], applyOrder);
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
    mutationFn: (ids: number[]): Promise<void> =>
      apiClient.api.recipes.byId(recipeId).steps.reorder.put({ ids }),
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
      apiClient.api.recipes.byId(recipeId).steps.byStepId(stepId).put({ text, order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeSteps", recipeId] });
    },
  });
}

export function useDeleteRecipeStep(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stepId: number) =>
      apiClient.api.recipes.byId(recipeId).steps.byStepId(stepId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeSteps", recipeId] });
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

export function useParseRecipeFromUrl() {
  return useMutation({
    mutationFn: async (url: string): Promise<ParsedRecipeResponse> => {
      try {
        const result = await apiClient.api.recipes.parseUrl.post({ url });
        return result as ParsedRecipeResponse;
      } catch (e) {
        const kiota = e as { responseStatusCode?: number };
        if (kiota.responseStatusCode !== undefined) {
          throw Object.assign(e as Error, { status: kiota.responseStatusCode });
        }
        throw e;
      }
    },
  });
}

export function useImportRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ImportRecipePayload): Promise<{ id: number }> => {
      try {
        const result = await apiClient.api.recipes.importEscaped.post({
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
        });
        if (!result?.id) throw new Error("Invalid response from import endpoint");
        return { id: result.id };
      } catch (e) {
        const kiota = e as { responseStatusCode?: number };
        if (kiota.responseStatusCode !== undefined) {
          throw Object.assign(e as Error, { status: kiota.responseStatusCode });
        }
        throw e;
      }
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

      const multipartBody = createMultipartBody();
      multipartBody.addOrReplacePart("file", file.type || "application/octet-stream", file);

      try {
        await apiClient.api.recipes.byId(recipeId).images.upload.post(multipartBody);
      } catch (e) {
        const kiota = e as { responseStatusCode?: number };
        if (kiota.responseStatusCode === 413) {
          throw new Error("File is too large. Please use an image under 10 MB.");
        }
        if (kiota.responseStatusCode === 401 || kiota.responseStatusCode === 403) {
          throw new Error("You are not authorised to upload images.");
        }
        throw new Error(`Upload failed (${kiota.responseStatusCode ?? "unknown"}). Please try again.`);
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
      apiClient.api.recipes.byId(recipeId).images.byImageId(imageId).delete(),
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

export function useRecipeTags(recipeId: number) {
  return useQuery({
    queryKey: ["recipeTags", recipeId],
    queryFn: () =>
      apiClient.api.recipes.byId(recipeId).tags.get().then(r => r ?? []) as Promise<RecipeTag[]>,
    enabled: recipeId > 0,
  });
}

export function useAddRecipeTag(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<RecipeTag> => {
      const result = await apiClient.api.recipes.byId(recipeId).tags.post({ name });
      if (!result) throw new Error("Failed to create tag");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeTags", recipeId] });
    },
  });
}

export function useDeleteRecipeTag(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: number) =>
      apiClient.api.recipes.byId(recipeId).tags.byTagId(tagId).delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeTags", recipeId] });
    },
  });
}

export interface ReimportRecipePayload {
  importName: boolean;
  importIngredients: boolean;
  importSteps: boolean;
  importImages: boolean;
}

export function useReimportRecipe(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReimportRecipePayload): Promise<void> => {
      const token =
        typeof globalThis.window !== "undefined"
          ? (localStorage.getItem("accessToken") ?? "")
          : "";
      const response = await fetch(
        `${API_BASE_URL}/api/recipes/${recipeId}/reimport`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...getHouseholdHeader(),
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        const err = new Error(text || `Error ${response.status}`) as Error & { status: number };
        err.status = response.status;
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipeSteps", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipeImages", recipeId] });
    },
  });
}
