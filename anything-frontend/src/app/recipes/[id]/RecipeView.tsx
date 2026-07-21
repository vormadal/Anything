"use client";

import { Clock, Users, Package, Layers, ImageIcon } from "lucide-react";
import { useRecipeDetails } from "@/hooks/useRecipes";
import Image from "next/image";
import { useCookingMode } from "@/context/CookingModeContext";

interface Props {
  recipeId: number;
}

export function RecipeView({ recipeId }: Props) {
  const isSafeUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  const getDisplayDomain = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    } catch {
      return url;
    }
  };

  // One aggregate request for the recipe plus its ingredients, steps, images
  // and tags (instead of five separate queries).
  const { data: detail, isLoading, error } = useRecipeDetails(recipeId);
  const recipe = detail;
  const ingredients = detail?.ingredients;
  const steps = detail?.steps;
  const images = detail?.images;
  const tags = detail?.tags;

  const sortedSteps = steps ? [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const heroImageUrl = images?.[0]?.originalUrl ?? "";

  const { session, completedStepIds, stopCooking, toggleStep } = useCookingMode();
  const isCooking = session?.recipeId === recipeId;

  return (
    <>
      {/* ── Hero: full-width image with overlaid title and tags ── */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt="Recipe image"
            fill
            className="object-cover"
            sizes="100vw"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300 dark:text-gray-600">
            <ImageIcon className="h-20 w-20" strokeWidth={1} />
            <p className="text-sm text-gray-400 dark:text-gray-500">No photo yet</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
            {recipe?.name ?? (isLoading ? "" : "Recipe")}
          </h1>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="px-4 sm:px-6 py-6">
        {isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load recipe. Please try again later.
          </div>
        )}

        {/* Recipe meta */}
        {(recipe?.link || recipe?.notes || recipe?.cookTimeMinutes != null || recipe?.servings != null) && (
          <div className="mb-8">
            {(recipe?.cookTimeMinutes != null || recipe?.servings != null) && (
              <div className="flex flex-wrap gap-3 mb-3">
                {recipe.cookTimeMinutes != null && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    {recipe.cookTimeMinutes} min
                  </span>
                )}
                {recipe.servings != null && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    {recipe.servingsType === "Quantity" ? (
                      <Package className="h-4 w-4" />
                    ) : recipe.servingsType === "Pieces" ? (
                      <Layers className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    {recipe.servings} {recipe.servingsType === "Quantity" ? "items" : recipe.servingsType === "Pieces" ? "pieces" : "people"}
                  </span>
                )}
              </div>
            )}
            {recipe?.link && isSafeUrl(recipe.link) && (
              <a
                href={recipe.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm block mb-2"
              >
                {getDisplayDomain(recipe.link)}
              </a>
            )}
            {recipe?.notes && (
              <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">
                {recipe.notes}
              </p>
            )}
          </div>
        )}

        {/* ── Ingredients ── */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Ingredients
          </h2>
          {ingredients?.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No ingredients yet.</p>
          )}
          {ingredients && ingredients.length > 0 && (
            <ul className="space-y-0.5">
              {ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex items-center gap-1 py-1">
                  <span className="text-gray-800 dark:text-gray-200 text-sm">
                    {(ingredient.amount != null || !!ingredient.unit) && (
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ingredient.amount != null ? ingredient.amount : ""}{ingredient.unit ? ` ${ingredient.unit}` : ""}
                      </span>
                    )}{" "}
                    {ingredient.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Steps ── */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Steps
          </h2>
          {sortedSteps.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No steps yet.</p>
          )}
          {sortedSteps.length > 0 && (
            <ol className="space-y-3">
              {sortedSteps.map((step, index) => {
                const stepId = step.id;
                const done = isCooking && stepId != null && completedStepIds.has(stepId);
                const handleToggle =
                  isCooking && stepId != null ? () => toggleStep(stepId) : undefined;
                return (
                  <li
                    key={step.id ?? index}
                    className={`flex items-start gap-3 ${isCooking && stepId != null ? "cursor-pointer select-none" : ""}`}
                    onClick={handleToggle}
                    onKeyDown={
                      handleToggle
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggle();
                            }
                          }
                        : undefined
                    }
                    role={handleToggle ? "button" : undefined}
                    tabIndex={handleToggle ? 0 : undefined}
                    aria-pressed={handleToggle ? done : undefined}
                  >
                    <span className="shrink-0 text-sm font-semibold text-gray-300 dark:text-gray-600 w-5 text-right mt-0.5">
                      {index + 1}.
                    </span>
                    <span className={`flex-1 min-w-0 text-sm leading-relaxed transition-colors ${done ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-800 dark:text-gray-200"}`}>
                      {step.text}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {isCooking && (
            <button
              type="button"
              onClick={stopCooking}
              className="mt-6 w-full py-2.5 px-4 rounded-lg border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              Stop cooking mode
            </button>
          )}
        </div>
      </div>
    </>
  );
}
