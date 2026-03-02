"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Plus, Check, Pencil, ShoppingCart, ImageIcon } from "lucide-react";
import {
  useRecipe,
  useRecipeIngredients,
  useRecipeSteps,
  useRecipeImages,
  useUpdateRecipe,
  useAddRecipeIngredient,
  useUpdateRecipeIngredient,
  useDeleteRecipeIngredient,
  useAddRecipeStep,
  useDeleteRecipeStep,
  useDeleteRecipeImage,
  useAddIngredientsToShoppingList,
} from "@/hooks/useRecipes";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { RecipeImageUpload } from "@/components/RecipeImageUpload";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const recipeId = Number(params.id);

  const isSafeUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  const [isEditMode, setIsEditMode] = useState(false);

  const [editName, setEditName] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("");

  const [editingIngredients, setEditingIngredients] = useState<
    Record<number, { name: string; amount: string; unit: string }>
  >({});

  const [newStepText, setNewStepText] = useState("");
  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const { data: ingredients } = useRecipeIngredients(recipeId);
  const { data: steps } = useRecipeSteps(recipeId);
  const { data: images } = useRecipeImages(recipeId);
  const { data: shoppingLists } = useShoppingLists();

  const updateRecipe = useUpdateRecipe();
  const addIngredient = useAddRecipeIngredient(recipeId);
  const updateIngredient = useUpdateRecipeIngredient(recipeId);
  const deleteIngredient = useDeleteRecipeIngredient(recipeId);
  const addStep = useAddRecipeStep(recipeId);
  const deleteStep = useDeleteRecipeStep(recipeId);
  const deleteImage = useDeleteRecipeImage(recipeId);
  const addToShoppingList = useAddIngredientsToShoppingList(recipeId);

  const handleEnterEditMode = () => {
    setEditName(recipe?.name ?? "");
    setEditLink(recipe?.link ?? "");
    setEditNotes(recipe?.notes ?? "");
    setEditingIngredients({});
    setIsEditMode(true);
  };

  const handleExitEditMode = async () => {
    const nameChanged = editName !== (recipe?.name ?? "");
    const linkChanged = editLink !== (recipe?.link ?? "");
    const notesChanged = editNotes !== (recipe?.notes ?? "");
    if (nameChanged || linkChanged || notesChanged) {
      try {
        await updateRecipe.mutateAsync({
          id: recipeId,
          name: editName,
          link: editLink || null,
          notes: editNotes || null,
        });
        toast.success("Recipe updated");
      } catch {
        toast.error("Failed to update recipe. Please try again.");
      }
    }
    setIsEditMode(false);
    setEditingIngredients({});
  };

  const handleIngredientFieldChange = (
    ingredientId: number,
    field: "name" | "amount" | "unit",
    value: string
  ) => {
    setEditingIngredients((prev) => ({
      ...prev,
      [ingredientId]: {
        ...(prev[ingredientId] ?? {
          name: ingredients?.find((i) => i.id === ingredientId)?.name ?? "",
          amount: String(ingredients?.find((i) => i.id === ingredientId)?.amount ?? ""),
          unit: ingredients?.find((i) => i.id === ingredientId)?.unit ?? "",
        }),
        [field]: value,
      },
    }));
  };

  const handleSaveIngredient = async (ingredientId: number) => {
    const edits = editingIngredients[ingredientId];
    if (!edits) return;
    const parsedAmount = Number(edits.amount);
    if (!edits.name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await updateIngredient.mutateAsync({
        ingredientId,
        name: edits.name,
        amount: parsedAmount,
        unit: edits.unit || null,
      });
      setEditingIngredients((prev) => {
        const next = { ...prev };
        delete next[ingredientId];
        return next;
      });
      toast.success("Ingredient updated");
    } catch {
      toast.error("Failed to update ingredient. Please try again.");
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(newIngredientAmount);
    if (!newIngredientName.trim() || !newIngredientAmount || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await addIngredient.mutateAsync({
        name: newIngredientName,
        amount: parsedAmount,
        unit: newIngredientUnit || undefined,
      });
      setNewIngredientName("");
      setNewIngredientAmount("");
      setNewIngredientUnit("");
      toast.success("Ingredient added");
    } catch {
      toast.error("Failed to add ingredient. Please try again.");
    }
  };

  const handleDeleteIngredient = async (ingredientId: number) => {
    try {
      await deleteIngredient.mutateAsync(ingredientId);
      toast.success("Ingredient removed");
    } catch {
      toast.error("Failed to remove ingredient. Please try again.");
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim()) return;

    const nextOrder = (steps?.length ?? 0) + 1;
    try {
      await addStep.mutateAsync({ text: newStepText, order: nextOrder });
      setNewStepText("");
      toast.success("Step added");
    } catch {
      toast.error("Failed to add step. Please try again.");
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    try {
      await deleteStep.mutateAsync(stepId);
      toast.success("Step removed");
    } catch {
      toast.error("Failed to remove step. Please try again.");
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteImage.mutateAsync(imageId);
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image. Please try again.");
    }
  };

  const handleAddToShoppingList = async (shoppingListId: number) => {
    try {
      await addToShoppingList.mutateAsync({ shoppingListId, multiplier });
      setShoppingListDialogOpen(false);
      toast.success("Ingredients added to shopping list");
    } catch {
      toast.error("Failed to add ingredients to shopping list. Please try again.");
    }
  };

  const sortedSteps = steps ? [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];

  const heroImageUrl = images?.[0]?.originalUrl ?? "";

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Hero: full-width image with overlaid controls and title ── */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImageUrl}
            alt="Recipe image"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300 dark:text-gray-600">
            <ImageIcon className="h-20 w-20" strokeWidth={1} />
            {isEditMode ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Upload a photo below</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No photo yet</p>
            )}
          </div>
        )}

        {/* Gradient for legibility of the title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

        {/* Back button — top left */}
        <button
          onClick={() => router.push("/recipes")}
          className="absolute top-4 left-4 text-sm text-white/90 hover:text-white font-medium bg-black/30 hover:bg-black/50 rounded-full px-3 py-1.5 transition-colors"
        >
          ← Back to Recipes
        </button>

        {/* Edit / Done button — top right */}
        <div className="absolute top-4 right-4">
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={isEditMode ? handleExitEditMode : handleEnterEditMode}
            disabled={updateRecipe.isPending}
            aria-label={isEditMode ? "Done editing" : "Edit recipe"}
            className={
              isEditMode
                ? ""
                : "bg-black/30 hover:bg-black/50 border-white/30 text-white hover:text-white"
            }
          >
            {isEditMode ? (
              <><Check className="h-4 w-4 mr-1" />Done</>
            ) : (
              <><Pencil className="h-4 w-4 mr-1" />Edit</>
            )}
          </Button>
        </div>

        {/* Title — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8">
          {isEditMode ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Recipe name"
              className="w-full bg-transparent text-white text-2xl font-bold placeholder-white/50 focus:outline-none border-b border-white/40 pb-0.5"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
              {recipe?.name ?? (isLoading ? "" : "Recipe")}
            </h1>
          )}
        </div>
      </div>

      {/* ── Image management strip (edit mode only) ── */}
      {isEditMode && (
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <RecipeImageUpload
            recipeId={recipeId}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["recipeImages", recipeId] })}
          />

          {images && images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((image) => (
                <div key={image.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.thumbnailUrl ?? ""}
                    alt="Recipe image"
                    className="h-16 w-24 object-cover rounded border border-gray-200 dark:border-gray-700"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    onClick={() => handleDeleteImage(image.id!)}
                    disabled={deleteImage.isPending}
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Page content ── */}
      <div className="px-4 sm:px-6 py-6">
        {isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load recipe. Make sure the API is running on port 5238.
          </div>
        )}

        {/* Recipe meta: link and notes */}
        {isEditMode ? (
          <div className="space-y-2 mb-8">
            <input
              type="url"
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              placeholder="Recipe link (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
        ) : (
          (recipe?.link || recipe?.notes) && (
            <div className="mb-8">
              {recipe.link && isSafeUrl(recipe.link) && (
                <a
                  href={recipe.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm block mb-2"
                >
                  {recipe.link}
                </a>
              )}
              {recipe.notes && (
                <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">
                  {recipe.notes}
                </p>
              )}
            </div>
          )
        )}

        {/* ── Ingredients ── */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Ingredients
          </h2>

          {isEditMode && (
            <form onSubmit={handleAddIngredient} className="mb-3">
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  value={newIngredientAmount}
                  onChange={(e) => setNewIngredientAmount(e.target.value)}
                  placeholder="Qty"
                  className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  step="any"
                />
                <input
                  type="text"
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  placeholder="Unit"
                  className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <input
                  type="text"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="Ingredient name"
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <Button type="submit" size="icon" disabled={addIngredient.isPending} aria-label="Add ingredient">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {ingredients && ingredients.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">
              {isEditMode ? "No ingredients yet. Add some above." : "No ingredients yet."}
            </p>
          )}

          {ingredients && ingredients.length > 0 && (
            <ul className="space-y-0.5">
              {ingredients.map((ingredient) => {
                const id = ingredient.id!;
                const edits = editingIngredients[id];
                return (
                  <li key={id} className="flex items-center gap-1 py-1">
                    {isEditMode ? (
                      <>
                        <input
                          type="number"
                          value={edits?.amount ?? String(ingredient.amount ?? "")}
                          onChange={(e) => handleIngredientFieldChange(id, "amount", e.target.value)}
                          placeholder="Qty"
                          aria-label="Ingredient quantity"
                          className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          step="any"
                        />
                        <input
                          type="text"
                          value={edits?.unit ?? (ingredient.unit ?? "")}
                          onChange={(e) => handleIngredientFieldChange(id, "unit", e.target.value)}
                          placeholder="Unit"
                          aria-label="Ingredient unit"
                          className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <input
                          type="text"
                          value={edits?.name ?? (ingredient.name ?? "")}
                          onChange={(e) => handleIngredientFieldChange(id, "name", e.target.value)}
                          placeholder="Ingredient name"
                          aria-label="Ingredient name"
                          className="flex-1 min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                        {edits && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSaveIngredient(id)}
                            disabled={updateIngredient.isPending}
                            aria-label="Save ingredient"
                            className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteIngredient(id)}
                          disabled={deleteIngredient.isPending}
                          aria-label="Remove ingredient"
                          className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-gray-800 dark:text-gray-200 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {ingredient.amount}{ingredient.unit ? ` ${ingredient.unit}` : ""}
                        </span>{" "}
                        {ingredient.name}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add to Shopping List — view mode only */}
          {!isEditMode && ingredients && ingredients.length > 0 && shoppingLists && shoppingLists.length > 0 && (
            <div className="mt-4">
              <Dialog open={shoppingListDialogOpen} onOpenChange={setShoppingListDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Add to Shopping List
                  </Button>
                </DialogTrigger>
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
                        onClick={() => setMultiplier((m) => Math.max(1, m - 1))}
                        className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg disabled:opacity-50"
                        disabled={multiplier <= 1}
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
                    {shoppingLists.map((list) => (
                      <li key={list.id}>
                        <button
                          onClick={() => handleAddToShoppingList(list.id!)}
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
          )}
        </div>

        {/* ── Steps ── */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Steps
          </h2>

          {sortedSteps.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">
              {isEditMode ? "No steps yet. Add one below." : "No steps yet."}
            </p>
          )}

          {sortedSteps.length > 0 && (
            <ol className="space-y-3">
              {sortedSteps.map((step, index) => (
                <li key={step.id} className="flex items-start gap-3">
                  <span className="shrink-0 text-sm font-semibold text-gray-300 dark:text-gray-600 w-5 text-right mt-0.5">
                    {index + 1}.
                  </span>
                  <span className="flex-1 min-w-0 text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                    {step.text}
                  </span>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteStep(step.id!)}
                      disabled={deleteStep.isPending}
                      aria-label="Remove step"
                      className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}

          {isEditMode && (
            <form onSubmit={handleAddStep} className="mt-4">
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  placeholder="Step description..."
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <Button type="submit" size="icon" disabled={addStep.isPending} aria-label="Add step">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
