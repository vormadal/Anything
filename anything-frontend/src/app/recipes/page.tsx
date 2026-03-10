"use client";

import { useRecipes, useRecipeImages, useRecipeTags } from "@/hooks/useRecipes";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { Search, X, CookingPot, Plus, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToFoodPlanDialog } from "@/components/AddToFoodPlanDialog";
import type { Recipe } from "@/lib/api-client/models/index";

const MAX_VISIBLE_TAGS = 3;

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const { data: images } = useRecipeImages(recipe.id!);
  const { data: tags } = useRecipeTags(recipe.id!);
  const firstImage = images?.[0];
  const imageUrl = firstImage?.thumbnailUrl ?? null;
  const [imgError, setImgError] = useState(false);
  const [foodPlanDialogOpen, setFoodPlanDialogOpen] = useState(false);

  const visibleTags = tags?.slice(0, MAX_VISIBLE_TAGS) ?? [];
  const extraTagCount = (tags?.length ?? 0) - visibleTags.length;

  return (
    <div className="relative overflow-hidden rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all">
      <button
        type="button"
        onClick={onClick}
        className="w-full cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:scale-[0.98]"
      >
        <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={recipe.name ?? "Recipe"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CookingPot className="h-10 w-10 text-gray-300 dark:text-gray-500" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
            <h3 className="text-lg font-bold text-white drop-shadow line-clamp-2 leading-snug">
              {recipe.name}
            </h3>
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {visibleTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm"
                  >
                    {tag.name}
                  </span>
                ))}
                {extraTagCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                    +{extraTagCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => setFoodPlanDialogOpen(true)}
        aria-label="Add to food plan"
        className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
      >
        <CalendarPlus className="h-4 w-4" />
      </button>
      {foodPlanDialogOpen && (
        <AddToFoodPlanDialog
          recipe={recipe}
          onClose={() => setFoodPlanDialogOpen(false)}
        />
      )}
    </div>
  );
}

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: recipes, isLoading, error } = useRecipes();
  const router = useRouter();
  // Keep a ref to router so the header effect closure always uses the latest instance without
  // adding router to effect deps (the test mock creates a new object on each render).
  // No dependency array is intentional: same mutable-ref pattern as handleExitEditModeRef in recipes/[id]/page.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });
  const { setHeaderActions } = useHeaderActions();

  // TODO: Replace client-side filtering with API search when backend supports it
  //       e.g. apiClient.api.recipes.get({ queryParameters: { search: searchQuery } })
  const filteredRecipes = useMemo(() => {
    if (!recipes) return undefined;
    if (!searchQuery.trim()) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter((r) => r.name?.toLowerCase().includes(query));
  }, [recipes, searchQuery]);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

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
            onClick={() => routerRef.current.push("/recipes/new")}
            aria-label="Create recipe"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>,
      searchOpen,
    );

    return () => setHeaderActions(null);
  }, [searchOpen, searchQuery, setHeaderActions, handleCloseSearch]);

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
