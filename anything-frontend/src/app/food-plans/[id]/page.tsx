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

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
// Delay before closing the suggestions dropdown on blur, allowing onMouseDown on a suggestion to fire first
const SUGGESTION_BLUR_DELAY_MS = 150;
// Default active days bitmask: Mon–Fri
const DEFAULT_ACTIVE_DAYS = 31;

/**
 * Convert a JS Date's getDay() value (0=Sun…6=Sat) to our weekday index (0=Mon…6=Sun).
 */
function jsToWeekdayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/**
 * Build the ordered list of day indices to display, starting from the weekStart day and
 * filtering by the activeDays bitmask.
 */
function getOrderedActiveDays(weekStartDate: Date, activeDays: number): { index: number; name: string }[] {
  const startIndex = jsToWeekdayIndex(weekStartDate.getDay());
  return Array.from({ length: 7 }, (_, i) => (startIndex + i) % 7)
    .filter((i) => (activeDays >> i) & 1)
    .map((i) => ({ index: i, name: DAYS_OF_WEEK[i] }));
}

function EntryBadge({
  entry,
  onDelete,
}: {
  entry: FoodPlanEntry;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded px-2 py-0.5 text-xs text-blue-800 dark:text-blue-200 group">
      <span className="flex-1 min-w-0 truncate">{entry.name}</span>
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
  const [name, setName] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addEntry = useAddFoodPlanEntry(foodPlanId);

  const suggestions = name.trim()
    ? (recipes ?? []).filter((r) =>
        r.name?.toLowerCase().includes(name.toLowerCase())
      )
    : [];

  const handleSelectSuggestion = (recipe: Recipe) => {
    setName(recipe.name ?? "");
    setSelectedRecipeId(recipe.id ?? null);
    setShowSuggestions(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setSelectedRecipeId(null);
    setShowSuggestions(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addEntry.mutateAsync({
        name: name.trim(),
        recipeId: selectedRecipeId,
        dayOfWeek,
      });
      toast.success("Entry added");
      onClose();
    } catch {
      toast.error("Failed to add entry. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2">
      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), SUGGESTION_BLUR_DELAY_MS)}
          placeholder="Meal name..."
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          autoFocus
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-md max-h-36 overflow-y-auto">
            {/* onMouseDown fires before onBlur, so the selection completes before the dropdown closes */}
            {suggestions.map((r) => (
              <li
                key={r.id}
                onMouseDown={() => handleSelectSuggestion(r)}
                className="px-2 py-1 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-800 dark:text-gray-200"
              >
                {r.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-1">
        <Button type="submit" size="sm" className="flex-1 text-xs h-7" disabled={addEntry.isPending || !name.trim()}>
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
  entries,
  recipes,
  onClose,
}: {
  foodPlanId: number;
  entries: FoodPlanEntry[] | undefined;
  recipes: Recipe[] | undefined;
  onClose: () => void;
}) {
  const { data: shoppingLists } = useShoppingLists();
  const addToShoppingList = useAddFoodPlanToShoppingList(foodPlanId);

  const recipeEntries = (entries ?? []).filter((e) => e.recipeId != null);
  const uniqueRecipeIds = [...new Set(recipeEntries.map((e) => e.recipeId!))];
  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));

  const [multipliers, setMultipliers] = useState<Record<number, number>>(() =>
    Object.fromEntries(uniqueRecipeIds.map((id) => [id, 1]))
  );

  const setMultiplier = (recipeId: number, delta: number) => {
    setMultipliers((prev) => ({
      ...prev,
      [recipeId]: Math.max(1, (prev[recipeId] ?? 1) + delta),
    }));
  };

  const handleSelect = async (listId: number) => {
    try {
      const recipeMultipliers = uniqueRecipeIds.map((recipeId) => ({
        recipeId,
        multiplier: multipliers[recipeId] ?? 1,
      }));
      await addToShoppingList.mutateAsync({ shoppingListId: listId, recipeMultipliers });
      toast.success("Ingredients added to shopping list");
      onClose();
    } catch {
      toast.error("Failed to add ingredients. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Add to Shopping List
        </h3>
        {uniqueRecipeIds.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Set the multiplier for each recipe:
            </p>
            <ul className="space-y-2">
              {uniqueRecipeIds.map((recipeId) => {
                const recipe = recipeMap.get(recipeId);
                return (
                  <li key={recipeId} className="flex items-center justify-between gap-2 py-1">
                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">
                      {recipe?.name ?? `Recipe #${recipeId}`}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMultiplier(recipeId, -1)}
                        disabled={(multipliers[recipeId] ?? 1) <= 1}
                        className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold disabled:opacity-50"
                        aria-label={`Decrease multiplier for ${recipe?.name}`}
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        {multipliers[recipeId] ?? 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMultiplier(recipeId, 1)}
                        className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                        aria-label={`Increase multiplier for ${recipe?.name}`}
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Select a shopping list:
        </p>
        <ul className="space-y-2 mb-4">
          {shoppingLists?.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-sm text-gray-800 dark:text-gray-200 disabled:opacity-50"
                onClick={() => list.id != null && handleSelect(list.id)}
                disabled={addToShoppingList.isPending}
              >
                {list.name}
              </button>
            </li>
          ))}
          {(!shoppingLists || shoppingLists.length === 0) && (
            <li className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
              No shopping lists available.
            </li>
          )}
        </ul>
        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Cancel
        </Button>
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
  const activeDays = plan.activeDays ?? DEFAULT_ACTIVE_DAYS;
  const orderedDays = getOrderedActiveDays(weekStartDate, activeDays);

  const lgColsClass: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
    7: "lg:grid-cols-7",
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-5xl">
      <div className="mb-4">
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
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${lgColsClass[orderedDays.length] ?? "lg:grid-cols-5"} gap-2`}>
        {orderedDays.map(({ index, name: dayName }) => (
          <DayColumn
            key={index}
            dayIndex={index}
            dayName={dayName}
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
          entries={entries}
          recipes={recipes}
          onClose={() => setShowShoppingListDialog(false)}
        />
      )}
    </div>
  );
}
