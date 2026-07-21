"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, ShoppingCart, MoreVertical, CalendarPlus, Trash2, RefreshCw, ChefHat, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import {
  useRecipeDetails,
  useDeleteRecipe,
  useAddIngredientsToShoppingList,
  useReimportRecipe,
} from "@/hooks/useRecipes";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { AddToFoodPlanDialog } from "@/components/AddToFoodPlanDialog";
import { ShareRecipeDialog } from "@/components/ShareRecipeDialog";
import { RecipeView } from "./RecipeView";
import { RecipeEditMode } from "./RecipeEditMode";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCookingMode, type CookingSession } from "@/context/CookingModeContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OFFLINE_TITLE_REIMPORT = "Reimporting a recipe requires an internet connection";

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

  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit") === "true";
  const [isEditMode, setIsEditMode] = useState(editParam);

  useEffect(() => {
    setIsEditMode(editParam);
  }, [editParam]);

  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [foodPlanDialogOpen, setFoodPlanDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reimportDialogOpen, setReimportDialogOpen] = useState(false);
  const [reimportName, setReimportName] = useState(true);
  const [reimportIngredients, setReimportIngredients] = useState(true);
  const [reimportSteps, setReimportSteps] = useState(true);
  const [reimportImages, setReimportImages] = useState(true);

  // Needed by both the view-mode cooking-session builder and the edit-mode
  // reimport dropdown/dialog (recipe.link) — kept in the parent since it's
  // always mounted, unlike RecipeView/RecipeEditMode which swap in and out.
  const { data: recipe } = useRecipeDetails(recipeId);
  const steps = recipe?.steps;
  // Only needed for the "add to shopping list" dialog — fetch lazily when it opens.
  const { data: shoppingLists } = useShoppingLists(shoppingListDialogOpen);

  const deleteRecipe = useDeleteRecipe();
  const addToShoppingList = useAddIngredientsToShoppingList(recipeId);
  const reimportRecipe = useReimportRecipe(recipeId);
  const isOnline = useOnlineStatus();

  const sortedSteps = steps ? [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];

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
      setDeleteConfirmOpen(false);
      toast.success("Recipe deleted");
      router.push("/recipes");
    } catch {
      toast.error("Failed to delete recipe. Please try again.");
      setDeleteConfirmOpen(false);
    }
  };

  const handleReimport = async () => {
    try {
      await reimportRecipe.mutateAsync({
        importName: reimportName,
        importIngredients: reimportIngredients,
        importSteps: reimportSteps,
        importImages: reimportImages,
      });
      toast.success("Recipe reimported successfully");
      setReimportDialogOpen(false);
    } catch {
      toast.error("Failed to reimport recipe. Please try again.");
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
      isEditMode ? (
        <div className="flex items-center gap-1 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {recipe?.link && (
                <DropdownMenuItem
                  onSelect={() => setReimportDialogOpen(true)}
                  disabled={!isOnline}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reimport from URL
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onSelect={() => setDeleteConfirmOpen(true)}
                disabled={!isOnline}
              >
                <Trash2 className="h-4 w-4" />
                Delete Recipe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShareDialogOpen(true)}
            aria-label="Share recipe"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setIsEditMode(true);
                  routerRef.current.push("?edit=true");
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit recipe
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShoppingListDialogOpen(true)} disabled={!isOnline}>
                <ShoppingCart className="h-4 w-4" />
                Add to Shopping List
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onSelect={() => setDeleteConfirmOpen(true)}
                disabled={!isOnline}
              >
                <Trash2 className="h-4 w-4" />
                Delete Recipe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    );
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [isEditMode, recipeId, recipe?.link, setHeaderActions, setLeftAction, isOnline]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageTitle>{isEditMode ? "Edit Recipe" : "Recipe"}</PageTitle>

      {isEditMode ? (
        <RecipeEditMode recipeId={recipeId} />
      ) : (
        <RecipeView recipeId={recipeId} />
      )}

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
                  disabled={addToShoppingList.isPending || !isOnline}
                  title={isOnline ? undefined : "Adding ingredients requires an internet connection"}
                  className="w-full text-left px-4 py-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {list.name}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* ── Add to Food Plan dialog ── */}
      {foodPlanDialogOpen && recipe && (
        <AddToFoodPlanDialog
          recipe={recipe}
          onClose={() => setFoodPlanDialogOpen(false)}
        />
      )}

      {/* ── Share recipe dialog ── */}
      <ShareRecipeDialog
        recipeId={recipeId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

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
              disabled={deleteRecipe.isPending || !isOnline}
              title={isOnline ? undefined : "Deleting a recipe requires an internet connection"}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reimport from URL dialog ── */}
      <Dialog open={reimportDialogOpen} onOpenChange={setReimportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reimport from URL</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Choose which parts to update from{" "}
            <a
              href={recipe?.link ?? ""}
              target="_blank"
              rel="noopener noreferrer"
              className="underline break-all"
            >
              {recipe?.link}
            </a>
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportName}
                onChange={(e) => setReimportName(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportIngredients}
                onChange={(e) => setReimportIngredients(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Ingredients</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportSteps}
                onChange={(e) => setReimportSteps(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Instructions</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reimportImages}
                onChange={(e) => setReimportImages(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Images</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setReimportDialogOpen(false)} disabled={reimportRecipe.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleReimport}
              disabled={
                reimportRecipe.isPending ||
                (!reimportName && !reimportIngredients && !reimportSteps && !reimportImages) ||
                !isOnline
              }
              title={isOnline ? undefined : OFFLINE_TITLE_REIMPORT}
            >
              {reimportRecipe.isPending ? "Importing…" : "Reimport"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
