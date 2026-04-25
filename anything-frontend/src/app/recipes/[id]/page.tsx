"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, ShoppingCart, MoreVertical, CalendarPlus, Trash2, Clock, Users, Package, Layers, ImageIcon, ChefHat } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import {
  useRecipe,
  useRecipeIngredients,
  useRecipeSteps,
  useRecipeImages,
  useDeleteRecipe,
  useAddIngredientsToShoppingList,
  useRecipeTags,
} from "@/hooks/useRecipes";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { AddToFoodPlanDialog } from "@/components/AddToFoodPlanDialog";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useCookingMode, type CookingSession } from "@/context/CookingModeContext";

// Reads live cooking state from context so the button reflects current state
// even when the header actions are only set once in a useEffect.
function CookingHeaderButton({
  recipeId,
  sessionGetter,
}: {
  recipeId: number;
  sessionGetter: React.RefObject<() => CookingSession | null>;
}) {
  const { session, startCooking, stopCooking } = useCookingMode();
  const isCooking = session?.recipeId === recipeId;

  const handleClick = () => {
    if (isCooking) {
      stopCooking();
    } else {
      const s = sessionGetter.current?.();
      if (s) startCooking(s);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label={isCooking ? "Stop cooking mode" : "Start cooking mode"}
      className={isCooking ? "text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40" : ""}
    >
      <ChefHat className="h-5 w-5" />
    </Button>
  );
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = Number(params.id);

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

  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [foodPlanDialogOpen, setFoodPlanDialogOpen] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const { data: ingredients } = useRecipeIngredients(recipeId);
  const { data: steps } = useRecipeSteps(recipeId);
  const { data: images } = useRecipeImages(recipeId);
  const { data: tags } = useRecipeTags(recipeId);
  const { data: shoppingLists } = useShoppingLists();

  const deleteRecipe = useDeleteRecipe();
  const addToShoppingList = useAddIngredientsToShoppingList(recipeId);

  const sortedSteps = steps ? [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const heroImageUrl = images?.[0]?.originalUrl ?? "";

  const { session, completedStepIds, stopCooking, toggleStep } = useCookingMode();
  const isCooking = session?.recipeId === recipeId;

  // Stable ref for the session builder so CookingHeaderButton can read current recipe/steps
  const sessionBuilderRef = useRef<() => CookingSession | null>(() => null);
  useEffect(() => {
    sessionBuilderRef.current = () =>
      recipe
        ? {
            recipeId,
            recipeName: recipe.name ?? "Recipe",
            steps: sortedSteps,
          }
        : null;
  });

  const handleAddToShoppingList = async (shoppingListId: number) => {
    try {
      await addToShoppingList.mutateAsync({ shoppingListId, multiplier });
      setShoppingListDialogOpen(false);
      toast.success("Ingredients added to shopping list");
    } catch {
      toast.error("Failed to add ingredients to shopping list. Please try again.");
    }
  };

  const handleDeleteRecipe = async () => {
    try {
      await deleteRecipe.mutateAsync(recipeId);
      toast.success("Recipe deleted");
      router.push("/recipes");
    } catch {
      toast.error("Failed to delete recipe. Please try again.");
      setDeleteConfirmOpen(false);
    }
  };

  const { setHeaderActions, setLeftAction } = useHeaderActions();

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  });

  useEffect(() => {
    setLeftAction({ type: "back", href: "/recipes" });
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <CookingHeaderButton recipeId={recipeId} sessionGetter={sessionBuilderRef} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setFoodPlanDialogOpen(true)}
          aria-label="Add to food plan"
        >
          <CalendarPlus className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => routerRef.current.push(`/recipes/${recipeId}/edit`)}>
              <Pencil className="h-4 w-4" />
              Edit recipe
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShoppingListDialogOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              Add to Shopping List
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
              onSelect={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Recipe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [recipeId, setHeaderActions, setLeftAction]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageTitle>Recipe</PageTitle>

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

        {/* ── Shopping list dialog ── */}
        <Dialog open={shoppingListDialogOpen} onOpenChange={setShoppingListDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add ingredients to shopping list</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Multiplier (scale ingredient quantities):
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMultiplier((m) => Math.max(0, m - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg disabled:opacity-50"
                  disabled={multiplier <= 0}
                  aria-label="Decrease multiplier"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{multiplier}</span>
                <button
                  type="button"
                  onClick={() => setMultiplier((m) => m + 1)}
                  className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg"
                  aria-label="Increase multiplier"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select a shopping list to add all ingredients to:
            </p>
            <ul className="space-y-2">
              {(shoppingLists ?? []).map((list) => (
                <li key={list.id}>
                  <button
                    onClick={() => handleAddToShoppingList(list.id ?? 0)}
                    disabled={addToShoppingList.isPending}
                    className="w-full text-left px-4 py-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {list.name}
                  </button>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Add to Food Plan dialog ── */}
      {foodPlanDialogOpen && recipe && (
        <AddToFoodPlanDialog
          recipe={recipe}
          onClose={() => setFoodPlanDialogOpen(false)}
        />
      )}

      {/* ── Delete recipe confirmation dialog ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this recipe? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRecipe}
              disabled={deleteRecipe.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
