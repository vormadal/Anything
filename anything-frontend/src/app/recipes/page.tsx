"use client";

import { useRecipes, useRecipeImages } from "@/hooks/useRecipes";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { Search, X, CookingPot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/lib/api-client/models/index";

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const { data: images } = useRecipeImages(recipe.id!);
  const firstImage = images?.[0];
  const imageUrl = firstImage?.thumbnailUrl ?? null;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:scale-[0.98]"
    >
      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
        {imageUrl && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={recipe.name ?? "Recipe"}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CookingPot className="h-10 w-10 text-gray-300 dark:text-gray-500" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {recipe.name}
        </h3>
      </div>
    </button>
  );
}

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: recipes, isLoading, error } = useRecipes();
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  // TODO: Replace client-side filtering with API search when backend supports it
  //       e.g. apiClient.api.recipes.get({ queryParameters: { search: searchQuery } })
  const filteredRecipes = useMemo(() => {
    if (!recipes) return undefined;
    if (!searchQuery.trim()) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter((r) => r.name?.toLowerCase().includes(query));
  }, [recipes, searchQuery]);

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center justify-end flex-1 ml-2">
        {/* Search input — grows to fill when open */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            searchOpen
              ? "grow opacity-100"
              : "grow-0 basis-0 opacity-0"
          }`}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full min-w-0 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>

        {/* Close search button */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            searchOpen
              ? "w-9 opacity-100 ml-1"
              : "w-0 opacity-0 ml-0"
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseSearch}
            aria-label="Close search"
            className="shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search button */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            !searchOpen
              ? "w-9 opacity-100"
              : "w-0 opacity-0"
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Search recipes"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Create recipe button */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            !searchOpen
              ? "w-9 opacity-100"
              : "w-0 opacity-0"
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/recipes/new")}
            aria-label="Create recipe"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>,
      searchOpen,
    );

    return () => setHeaderActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, searchQuery, setHeaderActions]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          Failed to load recipes. Make sure the API is running on port 5238.
        </div>
      )}

      {filteredRecipes?.length === 0 && !isLoading && !error && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {searchQuery
            ? "No recipes match your search."
            : "No recipes yet. Tap + to create your first one!"}
        </div>
      )}

      {filteredRecipes && filteredRecipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => router.push(`/recipes/${recipe.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
