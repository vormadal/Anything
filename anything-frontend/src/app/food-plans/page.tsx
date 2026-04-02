"use client";

import { Button } from "@/components/ui/button";
import {
  useFoodPlanSettings,
  useFoodPlanEntries,
  useFoodPlanNotes,
  useAddFoodPlanEntry,
  useDeleteFoodPlanEntry,
  useAddFoodPlanToShoppingList,
  useUpsertFoodPlanNote,
  useDeleteFoodPlanNote,
} from "@/hooks/useFoodPlans";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useRecipes } from "@/hooks/useRecipes";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { FoodPlanEntry, FoodPlanNote, Recipe } from "@/lib/api-client/models/index";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, X, ChevronLeft, ChevronRight, Settings, Pencil, Check } from "lucide-react";
import { bitmaskToDaySet, toDateInputValue, toUtcMidnight } from "@/lib/foodPlanUtils";
import { format, isSameDay, addDays as dateFnsAddDays } from "date-fns";
import { da } from "date-fns/locale";

const DEFAULT_ACTIVE_DAYS = 31;
const SUGGESTION_BLUR_DELAY_MS = 150;

function addDays(date: Date, days: number): Date {
  return dateFnsAddDays(date, days);
}

function getDayLabel(date: Date, today: Date): { relative: string | null; weekday: string; dateStr: string } {
  const isToday = isSameDay(date, today);
  const isTomorrow = isSameDay(date, dateFnsAddDays(today, 1));
  const isYesterday = isSameDay(date, dateFnsAddDays(today, -1));

  let relative: string | null = null;
  if (isToday) relative = "i dag";
  else if (isTomorrow) relative = "i morgen";
  else if (isYesterday) relative = "i går";

  const weekday = format(date, "EEEE", { locale: da });
  const dateStr = format(date, "d. MMMM", { locale: da });

  return { relative, weekday, dateStr };
}

function EntryBadge({
  entry,
  onDelete,
}: {
  entry: FoodPlanEntry;
  onDelete: () => void;
}) {
  const isAddedToShoppingList = !!entry.addedToShoppingListOn;
  return (
    <div className={`rounded px-2 py-1 text-sm group flex items-center gap-1 ${
      isAddedToShoppingList
        ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200"
        : "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200"
    }`}>
      {entry.recipeId ? (
        <a
          href={`/recipes/${entry.recipeId}`}
          className="flex-1 min-w-0 truncate hover:underline"
        >
          {entry.name}
        </a>
      ) : (
        <span className="flex-1 min-w-0 truncate">{entry.name}</span>
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

function DayNoteEditor({
  note,
  dateStr,
  onSave,
  onDelete,
}: {
  note: FoodPlanNote | null;
  dateStr: string;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note?.note ?? "");

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    } else {
      onDelete();
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setEditing(false); setText(note?.note ?? ""); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note for this day..."
          className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
          autoFocus
          maxLength={500}
          data-testid={`note-input-${dateStr}`}
        />
        <button
          onClick={handleSave}
          className="shrink-0 text-green-500 hover:text-green-700 transition-colors"
          aria-label="Save note"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setEditing(false); setText(note?.note ?? ""); }}
          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Cancel note"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (note?.note) {
    return (
      <div className="flex items-start gap-1 mt-1">
        <p className="flex-1 text-xs text-gray-500 dark:text-gray-400 italic truncate" title={note.note}>
          {note.note}
        </p>
        <button
          onClick={() => { setText(note.note ?? ""); setEditing(true); }}
          className="shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
          aria-label="Edit note"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete note"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="mt-1 text-xs text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-0.5"
      aria-label="Add day note"
    >
      <Plus className="h-3 w-3" />
      Note
    </button>
  );
}

function AddEntryDialog({
  date,
  recipes,
  onClose,
}: {
  date: Date;
  recipes: Recipe[] | undefined;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addEntry = useAddFoodPlanEntry();

  const weekdayLabel = format(date, "EEEE", { locale: da });
  const dateLabelStr = format(date, "d. MMMM", { locale: da });

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
        date: toUtcMidnight(date),
      });
      toast.success("Entry added");
      onClose();
    } catch {
      toast.error("Failed to add entry. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 capitalize">
          {weekdayLabel}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{dateLabelStr}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meal
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), SUGGESTION_BLUR_DELAY_MS)}
                placeholder="Meal name..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-md max-h-36 overflow-y-auto">
                  {suggestions.map((r) => (
                    <li
                      key={r.id}
                      onMouseDown={() => handleSelectSuggestion(r)}
                      className="px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-800 dark:text-gray-200"
                    >
                      {r.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={addEntry.isPending || !name.trim()}>
              {addEntry.isPending ? "Adding..." : "Add meal"}
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

function AddToShoppingListDialog({
  startDate,
  endDate,
  entries,
  recipes,
  onClose,
}: {
  startDate: Date;
  endDate: Date;
  entries: FoodPlanEntry[] | undefined;
  recipes: Recipe[] | undefined;
  onClose: () => void;
}) {
  const { data: shoppingLists } = useShoppingLists();
  const addToShoppingList = useAddFoodPlanToShoppingList();

  const recipeEntries = (entries ?? []).filter((e) => e.recipeId != null);
  const uniqueRecipeIds = [...new Set(recipeEntries.map((e) => e.recipeId ?? 0))];
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
      await addToShoppingList.mutateAsync({
        shoppingListId: listId,
        startDate: toUtcMidnight(startDate),
        endDate: toUtcMidnight(endDate),
        recipeMultipliers,
      });
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

function DayRow({
  date,
  today,
  entries,
  note,
  recipes,
  onDeleteEntry,
  onSaveNote,
  onDeleteNote,
}: {
  date: Date;
  today: Date;
  entries: FoodPlanEntry[];
  note: FoodPlanNote | null;
  recipes: Recipe[] | undefined;
  onDeleteEntry: (entryId: number) => void;
  onSaveNote: (dateStr: string, text: string) => void;
  onDeleteNote: (noteId: number) => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const dateStr = toDateInputValue(date);
  const dayEntries = entries.filter((e) => {
    if (!e.date) return false;
    const entryDate = new Date(e.date);
    return toDateInputValue(entryDate) === dateStr;
  });

  const { relative, weekday, dateStr: formattedDate } = getDayLabel(date, today);
  const isToday = relative === "i dag";

  return (
    <>
      <div className={`rounded-lg border p-3 ${
        isToday
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }`}>
        {/* Day header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-semibold capitalize ${
                isToday ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-200"
              }`}>
                {weekday}
              </h3>
              {relative && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  isToday
                    ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>
                  {relative}
                </span>
              )}
            </div>
            <p className={`text-xs ${
              isToday ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
            }`}>
              {formattedDate}
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
            aria-label={`Add meal for ${weekday}`}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {/* Entries */}
        {dayEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {dayEntries.map((entry) => (
              <EntryBadge
                key={entry.id}
                entry={entry}
                onDelete={() => onDeleteEntry(entry.id ?? 0)}
              />
            ))}
          </div>
        )}

        {/* Per-day note */}
        <DayNoteEditor
          note={note}
          dateStr={dateStr}
          onSave={(text) => onSaveNote(toDateInputValue(date), text)}
          onDelete={() => note?.id != null && onDeleteNote(note.id)}
        />
      </div>
      {showAddDialog && (
        <AddEntryDialog
          date={date}
          recipes={recipes}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </>
  );
}

export default function FoodPlanPage() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showShoppingListDialog, setShowShoppingListDialog] = useState(false);
  const { setHeaderActions } = useHeaderActions();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  // Start from today, shifting by weeks
  const startDay = useMemo(() => addDays(today, weekOffset * 7), [weekOffset, today]);
  const endDay = useMemo(() => addDays(startDay, 6), [startDay]);

  const startDateStr = toDateInputValue(startDay);
  const endDateStr = toDateInputValue(endDay);

  const { data: settings } = useFoodPlanSettings();
  const { data: entries, isLoading } = useFoodPlanEntries(
    startDateStr + "T00:00:00Z",
    endDateStr + "T23:59:59Z"
  );
  const { data: notes } = useFoodPlanNotes(
    startDateStr + "T00:00:00Z",
    endDateStr + "T23:59:59Z"
  );
  const { data: recipes } = useRecipes();
  const deleteEntry = useDeleteFoodPlanEntry();
  const upsertNote = useUpsertFoodPlanNote();
  const deleteNote = useDeleteFoodPlanNote();

  const activeDays = settings?.activeDays ?? DEFAULT_ACTIVE_DAYS;
  const activeDaySet = bitmaskToDaySet(activeDays);

  const orderedDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => i)
      .map((i) => ({
        index: i,
        date: addDays(startDay, i),
      }))
      .filter(({ date }) => {
        const jsDay = date.getDay();
        const ourDay = (jsDay + 6) % 7;
        return activeDaySet.has(ourDay);
      });
  }, [startDay, activeDaySet]);

  const getNoteForDate = (date: Date): FoodPlanNote | null => {
    if (!notes) return null;
    const dateStr = toDateInputValue(date);
    return notes.find((n) => n.date && toDateInputValue(new Date(n.date)) === dateStr) ?? null;
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success("Entry removed");
    } catch {
      toast.error("Failed to remove entry. Please try again.");
    }
  };

  const handleSaveNote = async (isoDate: string, text: string) => {
    try {
      await upsertNote.mutateAsync({ date: isoDate, note: text });
    } catch {
      toast.error("Failed to save note. Please try again.");
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNote.mutateAsync(noteId);
    } catch {
      toast.error("Failed to delete note. Please try again.");
    }
  };

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/food-plans/settings")}
          aria-label="Food plan settings"
          title="Food plan settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
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
  }, [setHeaderActions, router]);

  const weekLabel = `${startDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${endDay.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <PageTitle>Food Plan</PageTitle>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
          >
            {weekLabel}
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {/* Vertical day list */}
      {!isLoading && (
        <div className="space-y-2">
          {orderedDays.map(({ index, date }) => (
            <DayRow
              key={`${startDateStr}-${index}`}
              date={date}
              today={today}
              entries={entries ?? []}
              note={getNoteForDate(date)}
              recipes={recipes}
              onDeleteEntry={handleDeleteEntry}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
            />
          ))}
        </div>
      )}

      {showShoppingListDialog && (
        <AddToShoppingListDialog
          startDate={startDay}
          endDate={endDay}
          entries={entries}
          recipes={recipes}
          onClose={() => setShowShoppingListDialog(false)}
        />
      )}
    </div>
  );
}
