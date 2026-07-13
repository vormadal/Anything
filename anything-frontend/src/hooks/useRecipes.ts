"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, createMultipartBody } from "@/lib/apiClient";
import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
  RecipeImageResponse,
  ParsedRecipeResponse,
  ParsedIngredient,
  ParsedStep,
  RecipeTag,
  ExportRecipeTagsResponse,
  ImportRecipeTagsRequest,
} from "@/lib/api-client/models/index";

// Re-export API model types that consumers import from this hook
export type { ParsedRecipeResponse, ParsedIngredient, ParsedStep, RecipeTag };
export type { ExportRecipeTagsResponse, ImportRecipeTagsRequest };

export interface TopTag {
  name: string;
  count: number;
}

/**
 * Thrown when the server rejects the recipe tags import payload for a data
 * reason (unknown recipe, duplicate name, tag too long, etc.) rather than a
 * malformed request. Callers use this to tell the two failure modes apart.
 */
export class RecipeTagImportRejectedError extends Error {}

// Shape of the Kiota-generated HttpValidationProblemDetails error thrown for 400 responses.
interface ValidationProblemError {
  responseStatusCode?: number;
  detail?: string | null;
  errors?: { additionalData?: Record<string, unknown> } | null;
}

function isValidationProblemError(err: unknown): err is ValidationProblemError {
  return typeof err === "object" && err !== null && "responseStatusCode" in err;
}

function extractValidationMessage(err: unknown): string | null {
  if (!isValidationProblemError(err) || err.responseStatusCode !== 400) return null;

  const fieldErrors = err.errors?.additionalData;
  const messages = fieldErrors
    ? Object.values(fieldErrors).flat().filter((m): m is string => typeof m === "string")
    : [];

  return messages.length > 0 ? messages.join(" ") : (err.detail ?? null);
}

export function useRecipes(search?: string, tag?: string) {
  return useQuery({
    queryKey: ["recipes", search ?? "", tag ?? ""],
    // Always refetch when the list page is re-entered (e.g. navigating back
    // after creating a recipe) so newly created recipes show without a manual
    // refresh — see issue #571.
    refetchOnMount: "always",
    queryFn: async (): Promise<Recipe[]> => {
      const recipes = await apiClient.api.recipes.get({
        queryParameters: { search, tag },
      });
      return (recipes ?? []) as Recipe[];
    },
  });
}

export function useTopRecipeTags(count = 10) {
  return useQuery({
    queryKey: ["topRecipeTags", count],
    // Keep the tag chips on the recipe list page current on every return — see
    // issue #571.
    refetchOnMount: "always",
    queryFn: async (): Promise<TopTag[]> => {
      const tags = await apiClient.api.recipes.tags.get({
        queryParameters: { count },
      });
      return (tags ?? []).map((t) => ({
        name: t.name ?? "",
        count: t.count ?? 0,
      }));
    },
  });
}

export function useRecipe(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => apiClient.api.recipes.byId(id).get() as Promise<Recipe>,
    enabled: id > 0,
    // Seed from an already-cached recipes list so navigating from a list to
    // a recipe the user just saw doesn't flash a bare loading state.
    placeholderData: () => {
      const lists = queryClient.getQueriesData<Recipe[]>({ queryKey: ["recipes"] });
      for (const [, data] of lists) {
        const match = data?.find((r) => r.id === id);
        if (match) return match;
      }
      return undefined;
    },
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

export interface ParseRecipeTextPayload {
  name?: string | null;
  ingredientsText?: string | null;
  stepsText?: string | null;
}

export function useParseRecipeFromText() {
  return useMutation({
    mutationFn: async (payload: ParseRecipeTextPayload): Promise<ParsedRecipeResponse> => {
      try {
        const result = await apiClient.api.recipes.parseText.post({
          name: payload.name ?? null,
          ingredientsText: payload.ingredientsText ?? null,
          stepsText: payload.stepsText ?? null,
        });
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

export async function uploadRecipeImageFile(recipeId: number, file: File): Promise<void> {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`
    );
  }

  const multipartBody = createMultipartBody();
  // Kiota's multipart serializer only supports string/ArrayBuffer/Uint8Array
  // part content — passing the File object itself throws before any request.
  const fileContent = await file.arrayBuffer();
  multipartBody.addOrReplacePart(
    "file",
    file.type || "application/octet-stream",
    fileContent,
    undefined,
    file.name
  );

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
}

export function useUploadRecipeImage(recipeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadRecipeImageFile(recipeId, file),
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

export function useExportRecipeTags() {
  return useMutation({
    mutationFn: async () => {
      const data = await apiClient.api.recipes.tags.exportEscaped.get();
      if (!data) throw new Error("Export failed");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "recipe-tags.json";
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportRecipeTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportRecipeTagsRequest) => {
      try {
        await apiClient.api.recipes.tags.importEscaped.post(data);
      } catch (err) {
        const message = extractValidationMessage(err);
        if (message) throw new RecipeTagImportRejectedError(message);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["topRecipeTags"] });
      queryClient.invalidateQueries({ queryKey: ["recipeTags"] });
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
      try {
        await apiClient.api.recipes.byId(recipeId).reimport.post({
          importName: payload.importName,
          importIngredients: payload.importIngredients,
          importSteps: payload.importSteps,
          importImages: payload.importImages,
        });
      } catch (e) {
        const kiota = e as { responseStatusCode?: number };
        if (kiota.responseStatusCode !== undefined) {
          throw Object.assign(e as Error, { status: kiota.responseStatusCode });
        }
        throw e;
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
