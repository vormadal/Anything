"use client";

import { Button } from "@/components/ui/button";
import { useRecipes, useCreateRecipe, useDeleteRecipe } from "@/hooks/useRecipes";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RecipesPage() {
  const [newRecipeName, setNewRecipeName] = useState("");
  const { data: recipes, isLoading, error } = useRecipes();
  const createRecipe = useCreateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const router = useRouter();

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeName.trim()) return;

    try {
      const newRecipe = await createRecipe.mutateAsync({ name: newRecipeName });
      setNewRecipeName("");
      toast.success("Recipe created");
      if (newRecipe?.id) {
        router.push(`/recipes/${newRecipe.id}`);
      }
    } catch {
      toast.error("Failed to create recipe. Please try again.");
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    try {
      await deleteRecipe.mutateAsync(id);
      toast.success("Recipe deleted");
    } catch {
      toast.error("Failed to delete recipe. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            Manage your recipes
          </p>
        </div>

        <form onSubmit={handleCreateRecipe} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
              placeholder="New recipe name..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <Button type="submit" disabled={createRecipe.isPending}>
              {createRecipe.isPending ? "Creating..." : "Create Recipe"}
            </Button>
          </div>
        </form>

        {isLoading && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Loading...
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load recipes. Make sure the API is running on port 5238.
          </div>
        )}

        {recipes?.length === 0 && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No recipes yet. Create your first one above!
          </div>
        )}

        {recipes && recipes.length > 0 && (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/recipes/${recipe.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/recipes/${recipe.id}`);
                  }
                }}
              >
                <span className="flex-1 text-gray-900 dark:text-white font-medium">
                  {recipe.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {recipe.createdOn ? new Date(recipe.createdOn).toLocaleDateString() : ""}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecipe(recipe.id!);
                  }}
                  disabled={deleteRecipe.isPending}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
