"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useExportRecipeTags,
  useImportRecipeTags,
  RecipeTagImportRejectedError,
  type ImportRecipeTagsRequest,
} from "@/hooks/useRecipes";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const SAMPLE_JSON = `{
  "recipes": [
    { "recipeName": "Tomato Soup", "tags": ["soup", "vegetarian", "dinner"] },
    { "recipeName": "Chicken Curry", "tags": ["spicy", "dinner"] }
  ]
}`;

const AI_PROMPT = `I'm attaching a JSON file exported from a recipe app. Please suggest tags for each recipe (e.g. cuisine, meal type, diet, main ingredient) and return the full file so I can re-upload it.

Follow these rules exactly:
- Keep the top-level shape: { "recipes": [ { "recipeName": "...", "tags": ["..."] } ] }.
- Do not rename, add, or remove any "recipeName" values - each one must match exactly (case-insensitive) with what I gave you.
- "tags" is the FULL replacement list of tags for that recipe, so include every tag it should end up with, not just new ones.
- Each tag must be 50 characters or fewer. Avoid duplicate tags.
- Drop the "ingredients" field if present - it's for your reference only and isn't used when importing.
- Return the complete JSON file, ready to re-upload, not a diff or partial list.`;

/**
 * Validates the parsed JSON has the shape the import endpoint expects, so
 * malformed files are caught with a specific message before ever reaching
 * the server (which would otherwise reject them as "data" errors instead).
 */
function describeShapeError(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("recipes" in data)) {
    return `The file must be a JSON object with a top-level "recipes" array.`;
  }
  const recipes = (data as { recipes: unknown }).recipes;
  if (!Array.isArray(recipes)) {
    return `"recipes" must be an array.`;
  }
  for (const [index, item] of recipes.entries()) {
    if (typeof item !== "object" || item === null) {
      return `Item ${index + 1} in "recipes" must be an object.`;
    }
    const { recipeName, tags } = item as { recipeName?: unknown; tags?: unknown };
    if (typeof recipeName !== "string" || recipeName.trim() === "") {
      return `Item ${index + 1} in "recipes" is missing a non-empty "recipeName" string.`;
    }
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
      return `Item ${index + 1} in "recipes" ("${recipeName}") is missing a "tags" array of strings.`;
    }
  }
  return null;
}

export function RecipeImportExportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRecipeTags = useExportRecipeTags();
  const importRecipeTags = useImportRecipeTags();
  const isOnline = useOnlineStatus();
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    try {
      await exportRecipeTags.mutateAsync();
      toast.success("Recipe tags exported.");
    } catch {
      toast.error("Failed to export recipe tags.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleCopyAiPrompt = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    toast.success("AI instructions copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        toast.error(
          "Import failed: the file isn't valid JSON. Check for a missing bracket, quote, or comma, or re-export a fresh copy."
        );
        return;
      }

      const shapeError = describeShapeError(data);
      if (shapeError) {
        toast.error(`Import failed: the file's format is wrong. ${shapeError}`);
        return;
      }

      await importRecipeTags.mutateAsync(data as ImportRecipeTagsRequest);
      toast.success("Recipe tags imported.");
    } catch (err) {
      if (err instanceof RecipeTagImportRejectedError) {
        toast.error(`Import rejected: ${err.message}`);
      } else {
        toast.error("Failed to import recipe tags. Check your connection and try again.");
      }
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={exportRecipeTags.isPending || !isOnline}
          title={isOnline ? undefined : "Exporting recipe tags requires an internet connection"}
          aria-label="Export recipe tags"
        >
          <Download className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleImportClick}
          disabled={importRecipeTags.isPending || !isOnline}
          title={isOnline ? undefined : "Importing recipe tags requires an internet connection"}
          aria-label="Import recipe tags"
        >
          <Upload className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Import</span>
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <p className="font-medium text-gray-800 dark:text-gray-100">How this works</p>
        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
          <li>
            <strong>Export</strong> downloads every recipe in this household with its name, ingredients, and current tags.
          </li>
          <li>
            <strong>Import</strong> reads the same JSON shape back. Each item is matched to an existing recipe by <code>recipeName</code> (case-insensitive) and its <code>tags</code> list fully replaces that recipe&apos;s current tags.
          </li>
          <li>
            Recipes must already exist &mdash; you can&apos;t create or rename recipes this way. Tags over 50 characters or unknown recipe names will reject the whole import.
          </li>
          <li>
            The <code>ingredients</code> field is only included for reference; it&apos;s ignored on import, so it&apos;s safe to remove.
          </li>
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Expected format
        </p>
        <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-100 dark:border-gray-700">
          {SAMPLE_JSON}
        </pre>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Editing with an AI
          </p>
          <button
            type="button"
            onClick={handleCopyAiPrompt}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            aria-label="Copy AI instructions"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Export the file, give it to an AI assistant along with this prompt, then re-import the result it returns.
        </p>
        <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded-md p-3 overflow-x-auto whitespace-pre-wrap border border-gray-100 dark:border-gray-700">
          {AI_PROMPT}
        </pre>
      </div>
    </div>
  );
}
