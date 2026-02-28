"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Plus, Check, Pencil, ShoppingCart } from "lucide-react";
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
  useAddRecipeImage,
  useDeleteRecipeImage,
  useAddIngredientsToShoppingList,
} from "@/hooks/useRecipes";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = Number(params.id);

  const isSafeUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  const [isEditMode, setIsEditMode] = useState(false);

  // Recipe header fields (editable directly in edit mode)
  const [editName, setEditName] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // New ingredient form
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("");

  // Per-ingredient inline edit state: maps ingredientId -> {name, amount, unit}
  const [editingIngredients, setEditingIngredients] = useState<
    Record<number, { name: string; amount: string; unit: string }>
  >({});

  const [newStepText, setNewStepText] = useState("");

  const [newImageUrl, setNewImageUrl] = useState("");

  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);

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
  const addImage = useAddRecipeImage(recipeId);
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
    // Save recipe header changes
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

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    try {
      await addImage.mutateAsync(newImageUrl);
      setNewImageUrl("");
      toast.success("Image added");
    } catch {
      toast.error("Failed to add image. Please try again.");
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
      await addToShoppingList.mutateAsync(shoppingListId);
      setShoppingListDialogOpen(false);
      toast.success("Ingredients added to shopping list");
    } catch {
      toast.error("Failed to add ingredients to shopping list. Please try again.");
    }
  };

  const sortedSteps = steps ? [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <button
              onClick={() => router.push("/recipes")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 block"
            >
              &larr; Back to Recipes
            </button>
            {isEditMode ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Recipe name"
                  className="w-full px-3 py-2 text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="url"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="Recipe link (optional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {recipe?.name ?? "Recipe"}
                </h2>
                {recipe?.link && isSafeUrl(recipe.link) && (
                  <a
                    href={recipe.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-1 block"
                  >
                    {recipe.link}
                  </a>
                )}
                {recipe?.notes && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm whitespace-pre-wrap">
                    {recipe.notes}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="icon"
              onClick={isEditMode ? handleExitEditMode : handleEnterEditMode}
              disabled={updateRecipe.isPending}
              aria-label={isEditMode ? "Done editing" : "Edit recipe"}
            >
              {isEditMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Loading...
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load recipe. Make sure the API is running on port 5238.
          </div>
        )}

        {/* Ingredients Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ingredients
          </h3>

          {isEditMode && (
            <form onSubmit={handleAddIngredient} className="mb-4">
              <div className="flex gap-1 items-center">
                <input
                  type="number"
                  value={newIngredientAmount}
                  onChange={(e) => setNewIngredientAmount(e.target.value)}
                  placeholder="Qty"
                  className="w-14 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  step="any"
                />
                <input
                  type="text"
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  placeholder="Unit"
                  className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <input
                  type="text"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="Ingredient name"
                  className="flex-1 min-w-0 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <Button type="submit" size="icon" disabled={addIngredient.isPending} aria-label="Add ingredient">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {ingredients && ingredients.length === 0 && (
            <div className="text-center py-4 text-gray-600 dark:text-gray-400">
              {isEditMode ? "No ingredients yet. Add some above!" : "No ingredients yet."}
            </div>
          )}

          {ingredients && ingredients.length > 0 && (
            <ul className="space-y-2">
              {ingredients.map((ingredient) => {
                const id = ingredient.id!;
                const edits = editingIngredients[id];
                return (
                  <li
                    key={id}
                    className="flex items-center gap-1 py-2 px-3 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
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
                      <span className="flex-1 min-w-0 text-gray-900 dark:text-white text-sm truncate">
                        {ingredient.amount} {ingredient.unit && `${ingredient.unit} `}{ingredient.name}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add to Shopping List - read mode only */}
          {!isEditMode && ingredients && ingredients.length > 0 && shoppingLists && shoppingLists.length > 0 && (
            <div className="mt-4">
              <Dialog open={shoppingListDialogOpen} onOpenChange={setShoppingListDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Add to Shopping List
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add ingredients to shopping list</DialogTitle>
                  </DialogHeader>
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

        {/* Steps Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Steps
          </h3>

          {isEditMode && (
            <form onSubmit={handleAddStep} className="mb-4">
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  placeholder="Step description..."
                  className="flex-1 min-w-0 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <Button type="submit" size="icon" disabled={addStep.isPending} aria-label="Add step">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {sortedSteps.length === 0 && (
            <div className="text-center py-4 text-gray-600 dark:text-gray-400">
              {isEditMode ? "No steps yet. Add some above!" : "No steps yet."}
            </div>
          )}

          {sortedSteps.length > 0 && (
            <ol className="space-y-2">
              {sortedSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex items-start gap-2 py-2 px-3 border border-gray-200 dark:border-gray-700 rounded-md"
                >
                  <span className="shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5 w-5 text-right">
                    {index + 1}.
                  </span>
                  <span className="flex-1 min-w-0 text-gray-900 dark:text-white text-sm">
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
        </div>

        {/* Images Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Images
          </h3>

          {isEditMode && (
            <form onSubmit={handleAddImage} className="mb-4">
              <div className="flex gap-1 items-center">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Image URL..."
                  className="flex-1 min-w-0 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <Button type="submit" size="icon" disabled={addImage.isPending} aria-label="Add image">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {images && images.length === 0 && (
            <div className="text-center py-4 text-gray-600 dark:text-gray-400">
              {isEditMode ? "No images yet. Add some above!" : "No images yet."}
            </div>
          )}

          {images && images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => {
                const imageUrl = image.url ?? "";
                const safeSrc = isSafeUrl(imageUrl) ? imageUrl : "";
                const safeHref = isSafeUrl(imageUrl) ? imageUrl : "#";
                return (
                <div key={image.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={safeSrc}
                    alt="Recipe image"
                    className="w-full h-40 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "block";
                    }}
                  />
                  <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden text-blue-600 dark:text-blue-400 hover:underline text-sm break-all p-2"
                  >
                    {image.url}
                  </a>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 text-red-500 hover:text-red-600 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800"
                      onClick={() => handleDeleteImage(image.id!)}
                      disabled={deleteImage.isPending}
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
