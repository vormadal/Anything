"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  RecommendationImportExportItem,
  SuggestionCategoryImportExportItem,
} from "@/lib/api-client/models/index";

/**
 * A single export/import file that bundles both suggestions and their categories,
 * so a manager exports/imports the whole vocabulary in one step instead of juggling
 * two separate files. Both halves are optional, so a legacy suggestions-only or
 * categories-only file still imports cleanly.
 */
export interface SuggestionsBundle {
  recommendations?: RecommendationImportExportItem[] | null;
  categories?: SuggestionCategoryImportExportItem[] | null;
}

const BUNDLE_FILENAME = "suggestions-export.json";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Builds the unified export client-side by calling the existing recommendation and
 * category export endpoints and merging their payloads into one downloadable file.
 * The `categories` array is carried alongside the per-item category strings so that
 * empty categories (and their order) survive a round-trip.
 */
export function useExportSuggestionsBundle() {
  return useMutation({
    mutationFn: async ({ uncategorizedOnly = false }: { uncategorizedOnly?: boolean } = {}) => {
      const [recs, cats] = await Promise.all([
        apiClient.api.shoppingListRecommendations.exportEscaped.get({
          queryParameters: { uncategorizedOnly },
        }),
        apiClient.api.suggestionCategories.exportEscaped.get(),
      ]);

      const bundle: SuggestionsBundle = {
        recommendations: recs?.recommendations ?? [],
        categories: cats?.categories ?? [],
      };
      downloadJson(bundle, BUNDLE_FILENAME);
    },
  });
}

/**
 * Splits one uploaded bundle back across the existing import endpoints. Categories
 * are imported first so that any category referenced by a recommendation already
 * exists. Each half is optional, so partial/legacy files import without error.
 */
export function useImportSuggestionsBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundle: SuggestionsBundle) => {
      const categories = bundle.categories ?? [];
      const recommendations = bundle.recommendations ?? [];

      if (categories.length > 0) {
        await apiClient.api.suggestionCategories.importEscaped.post({ categories });
      }
      if (recommendations.length > 0) {
        await apiClient.api.shoppingListRecommendations.importEscaped.post({ recommendations });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingListRecommendations"] });
      queryClient.invalidateQueries({ queryKey: ["suggestionCategories"] });
    },
  });
}
