"use client";

import { Button } from "@/components/ui/button";
import {
  useRecipe,
  useRecipeIngredients,
  useRecipeSteps,
  useRecipeImages,
  useUpdateRecipe,
  useAddRecipeIngredient,
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
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("");
  const [newIngredientGroup, setNewIngredientGroup] = useState("");

  const [newStepText, setNewStepText] = useState("");

  const [newImageUrl, setNewImageUrl] = useState("");

  const [selectedShoppingListId, setSelectedShoppingListId] = useState<number>(0);

  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const { data: ingredients } = useRecipeIngredients(recipeId);
  const { data: steps } = useRecipeSteps(recipeId);
  const { data: images } = useRecipeImages(recipeId);
  const { data: shoppingLists } = useShoppingLists();

  const updateRecipe = useUpdateRecipe();
  const addIngredient = useAddRecipeIngredient(recipeId);
  const deleteIngredient = useDeleteRecipeIngredient(recipeId);
  const addStep = useAddRecipeStep(recipeId);
  const deleteStep = useDeleteRecipeStep(recipeId);
  const addImage = useAddRecipeImage(recipeId);
  const deleteImage = useDeleteRecipeImage(recipeId);
  const addToShoppingList = useAddIngredientsToShoppingList(recipeId);

  const handleStartEditRecipe = () => {
    setEditName(recipe?.name ?? "");
    setEditLink(recipe?.link ?? "");
    setEditNotes(recipe?.notes ?? "");
    setIsEditingRecipe(true);
  };

  const handleSaveRecipe = async () => {
    try {
      await updateRecipe.mutateAsync({
        id: recipeId,
        name: editName,
        link: editLink || null,
        notes: editNotes || null,
      });
      setIsEditingRecipe(false);
      toast.success("Recipe updated");
    } catch {
      toast.error("Failed to update recipe. Please try again.");
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
        group: newIngredientGroup || undefined,
      });
      setNewIngredientName("");
      setNewIngredientAmount("");
      setNewIngredientUnit("");
      setNewIngredientGroup("");
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

  const handleAddToShoppingList = async () => {
    if (!selectedShoppingListId) return;

    try {
      await addToShoppingList.mutateAsync(selectedShoppingListId);
      toast.success("Ingredients added to shopping list");
    } catch {
      toast.error("Failed to add ingredients to shopping list. Please try again.");
    }
  };

  const sortedSteps = steps ? [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <button
                onClick={() => router.push("/recipes")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 block"
              >
                ← Back to Recipes
              </button>
              {isEditingRecipe ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Recipe name"
                    className="w-full px-3 py-2 text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveRecipe} disabled={updateRecipe.isPending}>
                      {updateRecipe.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingRecipe(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {recipe?.name ?? "Recipe"}
                  </h1>
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
            <div className="flex gap-2">
              {isEditMode && !isEditingRecipe && (
                <Button variant="outline" size="sm" onClick={handleStartEditRecipe}>
                  Edit Details
                </Button>
              )}
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setIsEditingRecipe(false);
                }}
              >
                {isEditMode ? "Done" : "Edit"}
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
              Failed to load recipe. Make sure the API is running on port 5000.
            </div>
          )}

          {/* Ingredients Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ingredients
            </h2>

            {isEditMode && (
              <form onSubmit={handleAddIngredient} className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1 min-w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="number"
                    value={newIngredientAmount}
                    onChange={(e) => setNewIngredientAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    step="any"
                  />
                  <input
                    type="text"
                    value={newIngredientUnit}
                    onChange={(e) => setNewIngredientUnit(e.target.value)}
                    placeholder="Unit (optional)"
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newIngredientGroup}
                    onChange={(e) => setNewIngredientGroup(e.target.value)}
                    placeholder="Group (optional)"
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <Button type="submit" disabled={addIngredient.isPending}>
                    {addIngredient.isPending ? "Adding..." : "Add"}
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
                {ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <span className="flex-1 text-gray-900 dark:text-white">
                      {ingredient.amount} {ingredient.unit && `${ingredient.unit} `}{ingredient.name}
                      {ingredient.group && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          ({ingredient.group})
                        </span>
                      )}
                    </span>
                    {isEditMode && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteIngredient(ingredient.id!)}
                        disabled={deleteIngredient.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add to Shopping List */}
            {ingredients && ingredients.length > 0 && shoppingLists && shoppingLists.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-md">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Add to Shopping List
                </h3>
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedShoppingListId}
                    onChange={(e) => setSelectedShoppingListId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={0}>Select a shopping list...</option>
                    {shoppingLists.map((list) => (
                      <option key={list.id} value={list.id ?? 0}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAddToShoppingList}
                    disabled={!selectedShoppingListId || addToShoppingList.isPending}
                  >
                    {addToShoppingList.isPending ? "Adding..." : "Add Ingredients"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Steps Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Steps
            </h2>

            {isEditMode && (
              <form onSubmit={handleAddStep} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    placeholder="Step description..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <Button type="submit" disabled={addStep.isPending}>
                    {addStep.isPending ? "Adding..." : "Add Step"}
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
              <ol className="space-y-2 list-decimal list-inside">
                {sortedSteps.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <span className="flex-1 text-gray-900 dark:text-white">
                      {step.text}
                    </span>
                    {isEditMode && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteStep(step.id!)}
                        disabled={deleteStep.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Images Section */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Images
            </h2>

            {isEditMode && (
              <form onSubmit={handleAddImage} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Image URL..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <Button type="submit" disabled={addImage.isPending}>
                    {addImage.isPending ? "Adding..." : "Add Image"}
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
                        variant="destructive"
                        size="sm"
                        className="mt-1 w-full"
                        onClick={() => handleDeleteImage(image.id!)}
                        disabled={deleteImage.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
