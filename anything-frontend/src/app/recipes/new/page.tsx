"use client";

import { Button } from "@/components/ui/button";
import { useCreateRecipe } from "@/hooks/useRecipes";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewRecipePage() {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const createRecipe = useCreateRecipe();
  const router = useRouter();

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
      if (newRecipe?.id) {
        router.push(`/recipes/${newRecipe.id}`);
      } else {
        router.push("/recipes");
      }
    } catch {
      toast.error("Failed to create recipe. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <button
          onClick={() => router.push("/recipes")}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 block"
        >
          &larr; Back to Recipes
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          New Recipe
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="recipe-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              id="recipe-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Recipe name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              required
            />
          </div>

          <div>
            <label
              htmlFor="recipe-link"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Link (optional)
            </label>
            <input
              id="recipe-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="recipe-notes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Notes (optional)
            </label>
            <textarea
              id="recipe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this recipe..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
      </div>
    </div>
  );
}
