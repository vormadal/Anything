"use client";

import { Button } from "@/components/ui/button";
import {
  useCreateRecipe,
  useImportRecipe,
  useParseRecipeFromUrl,
} from "@/hooks/useRecipes";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";

type Mode = "select" | "url" | "manual";

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white";

const LABEL_CLASS =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function NewRecipePage() {
  const [mode, setMode] = useState<Mode>("select");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const createRecipe = useCreateRecipe();
  const importRecipe = useImportRecipe();
  const parseFromUrl = useParseRecipeFromUrl();
  const router = useRouter();
  const { setLeftAction } = useHeaderActions();

  useEffect(() => {
    setLeftAction({ type: "back", href: "/recipes" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      const result = await parseFromUrl.mutateAsync(urlInput.trim());
      if (result) {
        const imported = await importRecipe.mutateAsync({
          name: result.name ?? "",
          link: urlInput.trim(),
          notes: null,
          ingredients: result.ingredients ?? [],
          steps: result.steps ?? [],
          imageUrl: result.imageUrl ?? null,
        });
        toast.success("Recipe imported");
        router.push(`/recipes/${imported.id}?edit=true`);
      }
    } catch (err) {
      const parseError = err as { status?: number };
      if (parseError.status === 422) {
        toast.error(
          "No recipe data found at this URL. Try a different URL or create the recipe manually."
        );
      } else {
        toast.error("Could not fetch the URL. Please check the link and try again.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const newRecipe = await createRecipe.mutateAsync({
        name,
        link: link || undefined,
        notes: notes || undefined,
      });
      toast.success("Recipe created");
      router.push(newRecipe?.id ? `/recipes/${newRecipe.id}?edit=true` : "/recipes");
    } catch {
      toast.error("Failed to create recipe. Please try again.");
    }
  };

  const resetToSelect = () => {
    setMode("select");
  };

  if (mode === "select") {
    return (
      <div className="container mx-auto px-4 py-4 max-w-lg">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            New Recipe
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode("url")}
              className="p-5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer text-left space-y-2 transition-colors"
            >
              <div className="font-semibold text-gray-900 dark:text-white">
                Import from URL
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paste a recipe URL and we&apos;ll extract the details
                automatically.
              </p>
            </button>
            <button
              onClick={() => setMode("manual")}
              className="p-5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer text-left space-y-2 transition-colors"
            >
              <div className="font-semibold text-gray-900 dark:text-white">
                Create manually
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter the recipe name, link, and notes yourself.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>New Recipe</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <button
          onClick={resetToSelect}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 block"
        >
          &larr; Back
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {mode === "url" ? "Import from URL" : "New Recipe"}
        </h2>

        {mode === "url" && (
          <form onSubmit={handleParse} className="space-y-4">
            <div>
              <label htmlFor="parse-url" className={LABEL_CLASS}>
                Recipe URL
              </label>
              <div className="flex gap-2">
                <input
                  id="parse-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                  required
                />
                <Button
                  type="submit"
                  disabled={parseFromUrl.isPending || importRecipe.isPending || !urlInput.trim()}
                >
                  {parseFromUrl.isPending || importRecipe.isPending ? "Importing..." : "Import"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {mode === "manual" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="recipe-name" className={LABEL_CLASS}>
                Name
              </label>
              <input
                id="recipe-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Recipe name"
                className={INPUT_CLASS}
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="recipe-link" className={LABEL_CLASS}>
                Link (optional)
              </label>
              <input
                id="recipe-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="recipe-notes" className={LABEL_CLASS}>
                Notes (optional)
              </label>
              <textarea
                id="recipe-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this recipe..."
                rows={3}
                className={INPUT_CLASS}
              />
            </div>

            <Button
              type="submit"
              disabled={createRecipe.isPending}
              className="w-full"
            >
              {createRecipe.isPending ? "Creating..." : "Create Recipe"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
