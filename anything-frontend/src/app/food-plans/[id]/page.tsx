"use client";

import { Button } from "@/components/ui/button";
import {
  useFoodPlan,
  useFoodPlanEntries,
  useAddFoodPlanEntry,
  useDeleteFoodPlanEntry,
  useAddFoodPlanToShoppingList,
} from "@/hooks/useFoodPlans";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useRecipes } from "@/hooks/useRecipes";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { FoodPlanEntry, Recipe } from "@/lib/api-client/models/index";
import { useHeaderActions } from "@/context/PageActionsContext";
import { ShoppingCart, Plus, X } from "lucide-react";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function EntryBadge({
  entry,
  recipes,
  onDelete,
}: {
  entry: FoodPlanEntry;
  recipes: Recipe[] | undefined;
  onDelete: () => void;
}) {
  const recipe = entry.recipeId ? recipes?.find((r) => r.id === entry.recipeId) : null;
  const displayName = recipe?.name ?? entry.customName ?? "Unknown";

  return (
    <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded px-2 py-0.5 text-xs text-blue-800 dark:text-blue-200 group">
      <span className="flex-1 min-w-0 truncate">{displayName}</span>
      {entry.mealType && (
        <span className="text-blue-500 dark:text-blue-400 shrink-0">· {entry.mealType}</span>
      )}
      <button
        onClick={onDelete}
        className="shrink-0 ml-1 text-blue-400 hover:text-red-500 transition-colors"
        aria-label="Remove entry"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddEntryForm({
  foodPlanId,
  dayOfWeek,
  recipes,
  onClose,
}: {
  foodPlanId: number;
  dayOfWeek: number;
  recipes: Recipe[] | undefined;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"recipe" | "custom">("recipe");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | "">("");
  const [customName, setCustomName] = useState("");
  const [mealType, setMealType] = useState<string>("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const addEntry = useAddFoodPlanEntry(foodPlanId);

  const filteredRecipes = recipes?.filter(
    (r) =>
      !recipeSearch.trim() ||
      r.name?.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "recipe" && selectedRecipeId) {
        await addEntry.mutateAsync({
          recipeId: Number(selectedRecipeId),
          dayOfWeek,
          mealType: mealType || null,
        });
      } else if (mode === "custom" && customName.trim()) {
        await addEntry.mutateAsync({
          customName: customName.trim(),
          dayOfWeek,
          mealType: mealType || null,
        });
      } else {
        return;
      }
      toast.success("Entry added");
      onClose();
    } catch {
      toast.error("Failed to add entry. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode("recipe")}
          className={`flex-1 text-xs py-1 px-2 rounded transition-colors ${
            mode === "recipe"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
          }`}
        >
          Recipe
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`flex-1 text-xs py-1 px-2 rounded transition-colors ${
            mode === "custom"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "recipe" ? (
        <div className="space-y-1">
          <input
            type="text"
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a recipe...</option>
            {filteredRecipes?.map((r) => (
              <option key={r.id} value={r.id!}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Meal name..."
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          autoFocus
        />
      )}

      <select
        value={mealType}
        onChange={(e) => setMealType(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      >
        <option value="">Meal type (optional)</option>
        {MEAL_TYPES.map((type) => (
          <option key={type} value={type}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </option>
        ))}
      </select>

      <div className="flex gap-1">
        <Button type="submit" size="sm" className="flex-1 text-xs h-7" disabled={addEntry.isPending}>
          {addEntry.isPending ? "Adding..." : "Add"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-xs h-7" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DayColumn({
  dayIndex,
  dayName,
  entries,
  foodPlanId,
  recipes,
  onDeleteEntry,
}: {
  dayIndex: number;
  dayName: string;
  entries: FoodPlanEntry[];
  foodPlanId: number;
  recipes: Recipe[] | undefined;
  onDeleteEntry: (entryId: number) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const dayEntries = entries.filter((e) => e.dayOfWeek === dayIndex);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 min-h-[120px]">
      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
        {dayName}
      </h3>
      <div className="space-y-1">
        {dayEntries.map((entry) => (
          <EntryBadge
            key={entry.id}
            entry={entry}
            recipes={recipes}
            onDelete={() => onDeleteEntry(entry.id!)}
          />
        ))}
      </div>
      {showAddForm ? (
        <AddEntryForm
          foodPlanId={foodPlanId}
          dayOfWeek={dayIndex}
          recipes={recipes}
          onClose={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-1 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
          aria-label={`Add meal for ${dayName}`}
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  );
}

function AddToShoppingListDialog({
  foodPlanId,
  onClose,
}: {
  foodPlanId: number;
  onClose: () => void;
}) {
  const { data: shoppingLists } = useShoppingLists();
  const addToShoppingList = useAddFoodPlanToShoppingList(foodPlanId);
  const [selectedListId, setSelectedListId] = useState<number | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId) return;
    try {
      await addToShoppingList.mutateAsync(Number(selectedListId));
      toast.success("Ingredients added to shopping list");
      onClose();
    } catch {
      toast.error("Failed to add ingredients. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add to Shopping List
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          All recipe ingredients from this week&apos;s plan will be added to the selected shopping list.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            autoFocus
          >
            <option value="">Select a shopping list...</option>
            {shoppingLists?.map((list) => (
              <option key={list.id} value={list.id!}>
                {list.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={!selectedListId || addToShoppingList.isPending}>
              {addToShoppingList.isPending ? "Adding..." : "Add Ingredients"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FoodPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);
  const [showShoppingListDialog, setShowShoppingListDialog] = useState(false);
  const { setHeaderActions } = useHeaderActions();

  const { data: plan, isLoading: planLoading } = useFoodPlan(planId);
  const { data: entries, isLoading: entriesLoading } = useFoodPlanEntries(planId);
  const { data: recipes } = useRecipes();
  const deleteEntry = useDeleteFoodPlanEntry(planId);

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success("Entry removed");
    } catch {
      toast.error("Failed to remove entry. Please try again.");
    }
  };

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowShoppingListDialog(true)}
          aria-label="Add to shopping list"
          title="Add all recipe ingredients to shopping list"
        >
          <ShoppingCart className="h-5 w-5" />
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  if (planLoading || entriesLoading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Food plan not found.
        </div>
      </div>
    );
  }

  const weekStartDate = plan.weekStart ? new Date(plan.weekStart) : new Date();

  return (
    <div className="container mx-auto px-4 py-4 max-w-5xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/food-plans")}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 block"
          >
            &larr; Back to Food Plans
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {plan.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Week of {weekStartDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 shrink-0"
          onClick={() => setShowShoppingListDialog(true)}
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Add to Shopping List</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {DAYS_OF_WEEK.map((day, index) => (
          <DayColumn
            key={day}
            dayIndex={index}
            dayName={day}
            entries={entries ?? []}
            foodPlanId={planId}
            recipes={recipes}
            onDeleteEntry={handleDeleteEntry}
          />
        ))}
      </div>

      {showShoppingListDialog && (
        <AddToShoppingListDialog
          foodPlanId={planId}
          onClose={() => setShowShoppingListDialog(false)}
        />
      )}
    </div>
  );
}
