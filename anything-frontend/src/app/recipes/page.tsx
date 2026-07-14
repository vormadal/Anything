"use client";

import { useRecipes, useTopRecipeTags } from "@/hooks/useRecipes";
import type { RecipeListItemResponse } from "@/hooks/useRecipes";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Search, X, CookingPot, Plus, CalendarPlus, Clock, Users, Package, Layers } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddToFoodPlanDialog } from "@/components/AddToFoodPlanDialog";

const MAX_VISIBLE_TAGS = 3;

function RecipeCard({ recipe, onClick }: { recipe: RecipeListItemResponse; onClick: () => void }) {
  const imageUrl = recipe.thumbnailUrl ?? null;
  const [imgError, setImgError] = useState(false);
  const [foodPlanDialogOpen, setFoodPlanDialogOpen] = useState(false);

  const tags = recipe.tags ?? [];
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const extraTagCount = tags.length - visibleTags.length;

  return (
    <div className="relative overflow-hidden rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all">
      <button
        type="button"
        onClick={onClick}
        className="block w-full cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:scale-[0.98]"
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
            {(recipe.cookTimeMinutes != null || recipe.servings != null) && (
              <div className="flex flex-wrap gap-2 mt-1">
                {recipe.cookTimeMinutes != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-white/80">
                    <Clock className="h-3 w-3" />
                    {recipe.cookTimeMinutes} min
                  </span>
                )}
                {recipe.servings != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-white/80">
                    {recipe.servingsType === "Quantity" ? (
                      <Package className="h-3 w-3" />
                    ) : recipe.servingsType === "Pieces" ? (
                      <Layers className="h-3 w-3" />
                    ) : (
                      <Users className="h-3 w-3" />
                    )}
                    {recipe.servings}
                  </span>
                )}
              </div>
            )}
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm"
                  >
                    {tag}
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: recipes, isLoading, error } = useRecipes(debouncedSearch || undefined, activeTag ?? undefined);
  const { data: topTags } = useTopRecipeTags(10);
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  // Debounce the search query so we don't fire a request on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearch("");
    setActiveTag(null);
  }, []);

  const handleTagClick = useCallback((tagName: string) => {
    setActiveTag((prev) => (prev === tagName ? null : tagName));
    setSearchQuery("");
    setDebouncedSearch("");
  }, []);

  const hasActiveFilter = searchQuery.trim() !== "" || activeTag !== null;

  // Header: just the create-recipe button
  useEffect(() => {
    setHeaderActions(
      <Link
        href="/recipes/new"
        aria-label="Create recipe"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
      >
        <Plus className="h-5 w-5" />
      </Link>,
      false,
    );

    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <PageTitle>Recipes</PageTitle>

      {/* Always-visible search bar */}
      <div className="mb-4 space-y-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes by name, tag or ingredient…"
            aria-label="Search recipes"
            className="w-full pl-9 pr-9 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Top tag suggestion chips */}
        {topTags && topTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
            {topTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => handleTagClick(tag.name)}
                aria-pressed={activeTag === tag.name}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTag === tag.name
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          Failed to load recipes. Please try again later.
        </div>
      )}

      {recipes?.length === 0 && !isLoading && !error && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {hasActiveFilter
            ? "No recipes match your search."
            : "No recipes yet. Tap + to create your first one!"}
        </div>
      )}

      {recipes && recipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {recipes.map((recipe) => (
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
