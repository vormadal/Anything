"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useFoodPlanSettings,
  foodPlanEntriesQueryOptions,
  foodPlanNotesQueryOptions,
  useFoodPlanSuggestions,
  useAddFoodPlanEntry,
  useDeleteFoodPlanEntry,
  useAddFoodPlanToShoppingList,
  useUpsertFoodPlanNote,
  useDeleteFoodPlanNote,
  type FoodPlanNote,
  type FoodPlanSuggestionResponse,
} from "@/hooks/useFoodPlans";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useRecipes } from "@/hooks/useRecipes";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FoodPlanEntry, RecipeListItemResponse } from "@/lib/api-client/models/index";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { HeaderMenu } from "@/components/HeaderMenu";
import { usePageActions } from "@/hooks/usePageActions";
import { ShoppingCart, X, Settings, CalendarDays, Sparkles, Plus } from "lucide-react";
import { bitmaskToDaySet, toDateInputValue, toUtcMidnight } from "@/lib/foodPlanUtils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { format, isSameDay, addDays as dateFnsAddDays } from "date-fns";
import { da } from "date-fns/locale";

const DEFAULT_ACTIVE_DAYS = 31;
const SUGGESTION_BLUR_DELAY_MS = 150;
const MAX_RANKED_SUGGESTIONS = 5;
// Entries are cheap to fetch, so start wide and grow in big steps: fewer
// extensions means fewer chances for the list to shift under the reader.
const INITIAL_WEEKS = 8;
const EXTEND_WEEKS = 8;
// Start extending well before the reader reaches either end of the list.
const SENTINEL_ROOT_MARGIN = "800px 0px";
// "Add to shopping list" offers recipes planned over the next four weeks and
// preselects (multiplier 1) those in the coming week; the rest start at 0.
const SHOPPING_LIST_WINDOW_DAYS = 28;
const SHOPPING_LIST_DEFAULT_DAYS = 7;

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

// Read-only entry chip shown on the day row (no delete button)
function EntryChip({ entry }: { entry: FoodPlanEntry }) {
  const isAdded = !!entry.addedToShoppingListOn;
  const cls = isAdded
    ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200"
    : "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200";
  return (
    <div className={`rounded px-2 py-1 text-sm flex items-center ${cls}`}>
      {entry.recipeId ? (
        <a href={`/recipes/${entry.recipeId}`} className="truncate hover:underline">
          {entry.name}
        </a>
      ) : (
        <span className="truncate">{entry.name}</span>
      )}
    </div>
  );
}

// Simplified day row — the entire card is a single clickable button
function DayRow({
  date,
  today,
  entries,
  note,
  onOpen,
  todayRef,
}: {
  date: Date;
  today: Date;
  entries: FoodPlanEntry[];
  note: FoodPlanNote | null;
  onOpen: () => void;
  todayRef?: React.Ref<HTMLButtonElement>;
}) {
  const dateStr = toDateInputValue(date);
  const dayEntries = entries.filter((e) => {
    if (!e.date) return false;
    return toDateInputValue(new Date(e.date)) === dateStr;
  });

  const { relative, weekday, dateStr: formattedDate } = getDayLabel(date, today);
  const isToday = relative === "i dag";

  return (
    <button
      ref={todayRef}
      aria-label={`${weekday}${relative ? `, ${relative}` : ""}`}
      data-day={dateStr}
      data-today={isToday ? "true" : undefined}
      className={`w-full text-left rounded-lg border p-3 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        isToday
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }`}
      onClick={onOpen}
    >
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
      </div>

      {/* Entry chips (read-only) */}
      {dayEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {dayEntries.map((entry) => (
            <EntryChip key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Suggest hint on empty upcoming days — opening the day shows ranked suggestions */}
      {dayEntries.length === 0 && date.getTime() >= today.getTime() && (
        <div className="mb-1">
          <span className="inline-flex items-center gap-1 rounded border border-dashed border-gray-300 dark:border-gray-600 px-2 py-1 text-xs text-gray-400 dark:text-gray-500">
            <Sparkles className="h-3 w-3" />
            Suggest meal
          </span>
        </div>
      )}

      {/* Note preview */}
      {note?.note && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate mt-1">
          {note.note}
        </p>
      )}
    </button>
  );
}

// Day management dialog — add/delete meals and edit note for a single day
function DayManagementDialog({
  date,
  entries,
  note,
  recipes,
  onClose,
  showSuggestionsOnOpen = false,
}: {
  date: Date;
  entries: FoodPlanEntry[];
  note: FoodPlanNote | null;
  recipes: RecipeListItemResponse[] | undefined;
  onClose: () => void;
  showSuggestionsOnOpen?: boolean;
}) {
  const [name, setName] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(showSuggestionsOnOpen);
  const [noteText, setNoteText] = useState(note?.note ?? "");
  const lastSavedNote = useRef(note?.note ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const addEntry = useAddFoodPlanEntry();
  const deleteEntry = useDeleteFoodPlanEntry();
  const upsertNote = useUpsertFoodPlanNote();
  const deleteNote = useDeleteFoodPlanNote();
  const isOnline = useOnlineStatus();

  const weekdayLabel = format(date, "EEEE", { locale: da });
  const dateLabelStr = format(date, "d. MMMM", { locale: da });
  const dateStr = toDateInputValue(date);

  // Typed search delegates to the backend recipe search (relevance-ranked and
  // typo-tolerant) rather than substring-filtering the in-memory recipe list.
  // While the field is empty the query key matches the parent's cached
  // useRecipes(), so no extra request is made until the user types.
  const debouncedName = useDebounce(name.trim(), 250);
  const { data: searchResults } = useRecipes(debouncedName || undefined);
  const suggestions = debouncedName ? (searchResults ?? []) : [];

  // Ranked suggestions from the backend, shown while the input is empty.
  const { data: rankedSuggestions } = useFoodPlanSuggestions(dateStr);
  const topSuggestions = (rankedSuggestions ?? []).slice(0, MAX_RANKED_SUGGESTIONS);
  const showRanked = showSuggestions && !name.trim() && topSuggestions.length > 0;
  const showNoRecipesHint =
    showSuggestions && !name.trim() && topSuggestions.length === 0 && recipes?.length === 0;

  const handleSelectSuggestion = (recipe: RecipeListItemResponse) => {
    setName(recipe.name ?? "");
    setSelectedRecipeId(recipe.id ?? null);
    setShowSuggestions(false);
  };

  const handleSelectRanked = (suggestion: FoodPlanSuggestionResponse) => {
    setName(suggestion.name ?? "");
    setSelectedRecipeId(suggestion.recipeId ?? null);
    setShowSuggestions(false);
  };

  const handleQuickAdd = async (suggestion: FoodPlanSuggestionResponse) => {
    try {
      await addEntry.mutateAsync({
        name: suggestion.name ?? "",
        recipeId: suggestion.recipeId ?? null,
        date: toUtcMidnight(date),
      });
    } catch {
      toast.error("Failed to add entry. Please try again.");
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setSelectedRecipeId(null);
    setShowSuggestions(true);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addEntry.mutateAsync({
        name: name.trim(),
        recipeId: selectedRecipeId,
        date: toUtcMidnight(date),
      });
      setName("");
      setSelectedRecipeId(null);
    } catch {
      toast.error("Failed to add entry. Please try again.");
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteEntry.mutateAsync(entryId);
    } catch {
      toast.error("Failed to remove entry. Please try again.");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const trimmed = noteText.trim();
      const noteDirty = trimmed !== lastSavedNote.current;

      const saves: Promise<unknown>[] = [];

      if (noteDirty) {
        if (trimmed) {
          saves.push(upsertNote.mutateAsync({ date: dateStr, note: trimmed }));
        } else if (note?.id != null) {
          saves.push(deleteNote.mutateAsync(note.id));
        }
      }

      if (name.trim()) {
        saves.push(
          addEntry.mutateAsync({
            name: name.trim(),
            recipeId: selectedRecipeId,
            date: toUtcMidnight(date),
          })
        );
      }

      await Promise.all(saves);

      if (noteDirty) {
        lastSavedNote.current = trimmed;
      }

      onClose();
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {weekdayLabel}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{dateLabelStr}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Meals section */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Meals
          </h4>

          {entries.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {entries.map((entry) => {
                const isAdded = !!entry.addedToShoppingListOn;
                const chipCls = isAdded
                  ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200"
                  : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200";
                return (
                  <li key={entry.id} className={`flex items-center gap-2 rounded border px-2 py-1 text-sm ${chipCls}`}>
                    {entry.recipeId ? (
                      <a href={`/recipes/${entry.recipeId}`} className="flex-1 min-w-0 truncate hover:underline">
                        {entry.name}
                      </a>
                    ) : (
                      <span className="flex-1 min-w-0 truncate">{entry.name}</span>
                    )}
                    <button
                      onClick={() => handleDeleteEntry(entry.id ?? 0)}
                      disabled={!isOnline}
                      title={isOnline ? undefined : "Removing an entry requires an internet connection"}
                      className="shrink-0 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      aria-label="Remove entry"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleAddEntry} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), SUGGESTION_BLUR_DELAY_MS)}
                placeholder="Meal name..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoComplete="off"
                autoFocus={showSuggestionsOnOpen}
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
              {showRanked && (
                // Deliberately not `absolute` (unlike the typeahead list above): this list can
                // auto-open on empty upcoming days (showSuggestionsOnOpen) and stay open without
                // the input ever blurring, so an absolutely-positioned overlay would sit on top
                // of the Note section below and swallow clicks meant for it (e.g. "Clear note").
                // Keeping it in normal flow pushes later content down instead of covering it.
                <ul className="mt-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-md max-h-56 overflow-y-auto">
                  <li className="flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    <Sparkles className="h-3 w-3" />
                    Suggestions
                  </li>
                  {topSuggestions.map((s) => (
                    <li
                      key={s.recipeId}
                      onMouseDown={() => handleSelectRanked(s)}
                      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.name}</div>
                        {s.reasons?.[0] && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.reasons[0]}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleQuickAdd(s);
                        }}
                        disabled={addEntry.isPending || !isOnline}
                        title={isOnline ? undefined : "Adding a meal requires an internet connection"}
                        className="shrink-0 rounded-full border border-gray-300 dark:border-gray-600 p-1 text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-300 disabled:opacity-50"
                        aria-label={`Add ${s.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showNoRecipesHint && (
                <div className="absolute z-10 left-0 right-0 mt-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-md px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                  <Link href="/recipes" className="hover:underline">
                    Add recipes to get suggestions
                  </Link>
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={addEntry.isPending || !name.trim() || !isOnline}
              title={isOnline ? undefined : "Adding a meal requires an internet connection"}
            >
              {addEntry.isPending ? "Adding..." : "Add meal"}
            </Button>
          </form>
        </div>

        {/* Note section */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Note
          </h4>
          <div className="relative">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              maxLength={500}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-7 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            {noteText && (
              <button
                type="button"
                onClick={() => setNoteText("")}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Clear note"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Save button */}
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isSaving || !isOnline}
          title={isOnline ? undefined : "Saving requires an internet connection"}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

const MULTIPLIER_BUTTON_CLASS =
  "w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold disabled:opacity-50";

interface PlannedRecipe {
  recipeId: number;
  dates: Date[];
  added: boolean;
}

/** One row per recipe — the backend adds each recipe's ingredients once,
 *  however many days it is planned — with the days it falls on. */
function groupByRecipe(entries: FoodPlanEntry[] | undefined): PlannedRecipe[] {
  const byRecipe = new Map<number, PlannedRecipe>();
  for (const e of entries ?? []) {
    if (e.recipeId == null || !e.date) continue;
    const row = byRecipe.get(e.recipeId) ?? { recipeId: e.recipeId, dates: [], added: true };
    row.dates.push(new Date(e.date));
    row.added = row.added && !!e.addedToShoppingListOn;
    byRecipe.set(e.recipeId, row);
  }
  return [...byRecipe.values()]
    .map((row) => ({ ...row, dates: row.dates.sort((a, b) => a.getTime() - b.getTime()) }))
    .sort((a, b) => a.dates[0].getTime() - b.dates[0].getTime());
}

/**
 * Two-step wizard. Step 1 lists the upcoming planned recipes with a
 * multiplier each — 1 for those in the coming week not already added, 0 for
 * the rest. Step 2 picks the list. The endpoint takes a date range, so the
 * range is derived from the recipes left above 0 (earliest to latest day);
 * every other recipe in the window is sent with multiplier 0, which the
 * backend skips.
 */
function AddToShoppingListDialog({
  today,
  recipes,
  onClose,
}: {
  today: Date;
  recipes: RecipeListItemResponse[] | undefined;
  onClose: () => void;
}) {
  const { data: shoppingLists } = useShoppingLists();
  const addToShoppingList = useAddFoodPlanToShoppingList();
  const isOnline = useOnlineStatus();
  const [step, setStep] = useState<"recipes" | "list">("recipes");

  const windowStart = toDateInputValue(today);
  const windowEnd = toDateInputValue(addDays(today, SHOPPING_LIST_WINDOW_DAYS - 1));
  const { data: entries, isLoading: entriesLoading } = useQuery(
    foodPlanEntriesQueryOptions(windowStart + "T00:00:00Z", windowEnd + "T23:59:59Z")
  );
  const plannedRecipes = useMemo(() => groupByRecipe(entries), [entries]);
  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));

  // Only overrides are stored; everything else falls back to the default, so
  // defaults are right even for entries that arrive after the dialog opens.
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const defaultSelectedUntil = toDateInputValue(addDays(today, SHOPPING_LIST_DEFAULT_DAYS - 1));
  const multiplierFor = (r: PlannedRecipe) =>
    overrides[r.recipeId] ??
    (!r.added && toDateInputValue(r.dates[0]) <= defaultSelectedUntil ? 1 : 0);

  const setMultiplier = (r: PlannedRecipe, delta: number) => {
    setOverrides((prev) => ({ ...prev, [r.recipeId]: Math.max(0, multiplierFor(r) + delta) }));
  };

  const selected = plannedRecipes.filter((r) => multiplierFor(r) > 0);
  const selectedDates = selected.flatMap((r) => r.dates).map((d) => d.getTime());
  const rangeStart = selectedDates.length > 0 ? new Date(Math.min(...selectedDates)) : null;
  const rangeEnd = selectedDates.length > 0 ? new Date(Math.max(...selectedDates)) : null;

  const handleSelect = async (listId: number) => {
    if (!rangeStart || !rangeEnd) return;
    try {
      await addToShoppingList.mutateAsync({
        shoppingListId: listId,
        startDate: toUtcMidnight(rangeStart),
        endDate: toUtcMidnight(rangeEnd),
        recipeMultipliers: plannedRecipes.map((r) => ({
          recipeId: r.recipeId,
          multiplier: multiplierFor(r),
        })),
      });
      toast.success("Ingredients added to shopping list");
      onClose();
    } catch {
      toast.error("Failed to add ingredients. Please try again.");
    }
  };

  const formatDay = (d: Date) => format(d, "EEE d. MMM", { locale: da });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Add to Shopping List
        </h3>

        {step === "recipes" ? (
          <>
            {entriesLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading…</p>
            )}
            {!entriesLoading && plannedRecipes.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                No recipes planned in the coming weeks.
              </p>
            )}
            <ul className="space-y-2 mb-4">
              {plannedRecipes.map((r) => {
                const recipe = recipeMap.get(r.recipeId);
                const name = recipe?.name ?? `Recipe #${r.recipeId}`;
                const multiplier = multiplierFor(r);
                return (
                  <li key={r.recipeId} className="flex items-center justify-between gap-2 py-1">
                    <div className={`flex-1 min-w-0 ${multiplier === 0 ? "opacity-60" : ""}`}>
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {r.dates.map(formatDay).join(", ")}
                        {r.added && " · added before"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMultiplier(r, -1)}
                        disabled={multiplier <= 0}
                        className={MULTIPLIER_BUTTON_CLASS}
                        aria-label={`Decrease multiplier for ${name}`}
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        {multiplier}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMultiplier(r, 1)}
                        className={MULTIPLIER_BUTTON_CLASS}
                        aria-label={`Increase multiplier for ${name}`}
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => setStep("list")}
                disabled={selected.length === 0}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            <ul className="space-y-2 mb-4">
              {shoppingLists?.map((list) => (
                <li key={list.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-sm text-gray-800 dark:text-gray-200 disabled:opacity-50"
                    onClick={() => list.id != null && handleSelect(list.id)}
                    disabled={addToShoppingList.isPending || !isOnline}
                    title={isOnline ? undefined : "Adding ingredients requires an internet connection"}
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
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep("recipes")}>
                Back
              </Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function FoodPlanPage() {
  const queryClient = useQueryClient();
  const [weeksBack, setWeeksBack] = useState(INITIAL_WEEKS);
  const [weeksForward, setWeeksForward] = useState(INITIAL_WEEKS);
  // Infinite scroll stays off until today has been scrolled into view — the
  // page renders at the top first, which would otherwise trip the top sentinel.
  const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
  const isExtending = useRef(false);
  // A row on screen just before rows were prepended, and where it was; the
  // layout effect below scrolls it back there so the reader's place is kept.
  const prependAnchor = useRef<{ day: string; top: number } | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [suggestOnOpen, setSuggestOnOpen] = useState(false);
  const [showShoppingListDialog, setShowShoppingListDialog] = useState(false);
  const [isTodayVisible, setIsTodayVisible] = useState(true);
  const todayRef = useRef<HTMLButtonElement | null>(null);

  // Callback ref for the anchor row (today, or the next active day): records it in
  // todayRef for the initial scroll and the "I dag" button, and watches its visibility.
  // The initial scroll itself lives in a layout effect that waits for notes/settings.
  // React 19 callback refs support returning a cleanup function, so this re-runs whenever
  // the anchor element attaches to the DOM (e.g. after data finishes loading).
  const todayRefCallback = useCallback(
    (el: HTMLButtonElement | null) => {
      todayRef.current = el;
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => setIsTodayVisible(entry.isIntersecting),
        { threshold: 0.1 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    },
    []
  );
  const { setHeaderActions } = useHeaderActions();
  const isOnline = useOnlineStatus();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const startDay = useMemo(() => addDays(today, -(weeksBack * 7)), [weeksBack, today]);
  const endDay = useMemo(() => addDays(today, weeksForward * 7), [weeksForward, today]);

  const startDateStr = toDateInputValue(startDay);
  const endDateStr = toDateInputValue(endDay);

  const { data: settings, isLoading: settingsLoading } = useFoodPlanSettings();
  // keepPreviousData is a safety net: extend() prefetches the wider range
  // before switching to it, but if that prefetch failed the list must keep
  // its rows rather than collapse into "Loading..." and lose the scroll spot.
  const { data: entries, isLoading } = useQuery({
    ...foodPlanEntriesQueryOptions(startDateStr + "T00:00:00Z", endDateStr + "T23:59:59Z"),
    placeholderData: keepPreviousData,
  });
  const { data: notes, isLoading: notesLoading } = useQuery({
    ...foodPlanNotesQueryOptions(startDateStr, endDateStr),
    placeholderData: keepPreviousData,
  });
  const { data: recipes } = useRecipes();

  const activeDays = settings?.activeDays ?? DEFAULT_ACTIVE_DAYS;
  const activeDaySet = bitmaskToDaySet(activeDays);

  const totalDays = weeksBack * 7 + weeksForward * 7 + 1;
  const orderedDays = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const date = addDays(startDay, i);
      const jsDay = date.getDay();
      const ourDay = (jsDay + 6) % 7;
      return { date, active: activeDaySet.has(ourDay) };
    }).filter(({ active }) => active);
  }, [startDay, totalDays, activeDaySet]);

  // The row scrolled into view on load: today, or the next active day when
  // today isn't one (e.g. a weekend with a Mon–Fri plan).
  const anchorKey = useMemo(() => {
    const todayKey = toDateInputValue(today);
    const anchor = orderedDays.find(({ date }) => toDateInputValue(date) >= todayKey);
    return anchor ? toDateInputValue(anchor.date) : null;
  }, [orderedDays, today]);

  // Scroll today into view (~1/4 down the viewport) once, after everything
  // that sizes the rows above it has loaded: settings decide which days are
  // rows, notes add a line to a row. Scrolling earlier left today drifting
  // down by however much arrived afterwards.
  useLayoutEffect(() => {
    if (hasScrolledToToday || isLoading || notesLoading || settingsLoading) return;
    const el = todayRef.current;
    if (!el) return;
    const elementTop = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elementTop - window.innerHeight * 0.25, behavior: "instant" });
    setHasScrolledToToday(true);
  }, [hasScrolledToToday, isLoading, notesLoading, settingsLoading, anchorKey]);

  const getNoteForDate = (date: Date): FoodPlanNote | null => {
    if (!notes) return null;
    const ds = toDateInputValue(date);
    // n.date is a Kiota DateOnly whose toString() yields "YYYY-MM-DD"; compare directly
    // against the date-input value to avoid local-timezone shifts.
    return notes.find((n) => n.date != null && n.date.toString() === ds) ?? null;
  };

  const getEntriesForDate = (date: Date): FoodPlanEntry[] => {
    if (!entries) return [];
    const ds = toDateInputValue(date);
    return entries.filter((e) => {
      if (!e.date) return false;
      return toDateInputValue(new Date(e.date)) === ds;
    });
  };

  const extend = useCallback(
    async (direction: "back" | "forward") => {
      if (isExtending.current) return;
      isExtending.current = true;
      try {
        const nextStart = direction === "back" ? addDays(today, -((weeksBack + EXTEND_WEEKS) * 7)) : startDay;
        const nextEnd = direction === "forward" ? addDays(today, (weeksForward + EXTEND_WEEKS) * 7) : endDay;
        const s = toDateInputValue(nextStart);
        const e = toDateInputValue(nextEnd);
        // Fetch first, render second: the new rows then appear in one commit
        // with their meals already in them, so their height is final and the
        // prepend compensation below is exact.
        await Promise.all([
          queryClient.prefetchQuery(foodPlanEntriesQueryOptions(s + "T00:00:00Z", e + "T23:59:59Z")),
          queryClient.prefetchQuery(foodPlanNotesQueryOptions(s, e)),
        ]);
        if (direction === "back") {
          const visible = [...document.querySelectorAll<HTMLElement>("[data-day]")].find(
            (el) => el.getBoundingClientRect().bottom > 0
          );
          if (visible?.dataset.day) {
            prependAnchor.current = { day: visible.dataset.day, top: visible.getBoundingClientRect().top };
          }
          setWeeksBack((w) => w + EXTEND_WEEKS);
        } else {
          setWeeksForward((w) => w + EXTEND_WEEKS);
        }
      } finally {
        isExtending.current = false;
      }
    },
    [queryClient, today, weeksBack, weeksForward, startDay, endDay]
  );

  // Measuring the anchor row (rather than the change in page height) makes
  // this correct with or without native scroll anchoring: where the browser
  // already compensated (Chrome/Firefox) the row hasn't moved and this is a
  // no-op; where it didn't (Safari) this does the whole correction. Native
  // anchoring must stay on — it is also what keeps today in place when notes
  // load into rows above it after the initial scroll.
  useLayoutEffect(() => {
    const anchor = prependAnchor.current;
    if (!anchor) return;
    prependAnchor.current = null;
    const el = document.querySelector(`[data-day="${anchor.day}"]`);
    if (!el) return;
    const drift = el.getBoundingClientRect().top - anchor.top;
    if (drift !== 0) window.scrollTo({ top: window.scrollY + drift, behavior: "instant" });
  }, [weeksBack]);

  // Re-created whenever the range changes so a sentinel that is *still* in
  // range after an extension fires again (observers only report changes).
  useEffect(() => {
    // With no anchor row in range there is nothing to scroll to first.
    if (isLoading || (!hasScrolledToToday && anchorKey !== null)) return;
    const observers = (
      [
        [topSentinelRef.current, "back"],
        [bottomSentinelRef.current, "forward"],
      ] as const
    ).flatMap(([el, direction]) => {
      if (!el) return [];
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) void extend(direction);
        },
        { rootMargin: SENTINEL_ROOT_MARGIN }
      );
      observer.observe(el);
      return [observer];
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [hasScrolledToToday, isLoading, anchorKey, extend]);


  // Scroll today into view, positioned ~1/4 down from the top of the viewport
  const scrollToToday = useCallback(() => {
    const el = todayRef.current;
    if (!el) return;
    const elementTop = el.getBoundingClientRect().top + window.scrollY;
    const offset = window.innerHeight * 0.25;
    window.scrollTo({ top: elementTop - offset, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setHeaderActions(
      <HeaderMenu items={[{ label: "Food plan settings", icon: Settings, href: "/food-plans/settings" }]} />
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  usePageActions([
    {
      label: "Add to shopping list",
      icon: ShoppingCart,
      onSelect: () => setShowShoppingListDialog(true),
      disabled: !isOnline,
      disabledReason: "Adding ingredients requires an internet connection",
    },
  ]);

  const selectedDayEntries = selectedDay ? getEntriesForDate(selectedDay) : [];
  const selectedDayNote = selectedDay ? getNoteForDate(selectedDay) : null;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <PageTitle>Food Plan</PageTitle>

      <div ref={topSentinelRef} data-testid="food-plan-top-sentinel" aria-hidden="true" />

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {!isLoading && (
        <div className="space-y-2">
          {orderedDays.map(({ date }) => (
            <DayRow
              key={toDateInputValue(date)}
              date={date}
              today={today}
              entries={entries ?? []}
              note={getNoteForDate(date)}
              onOpen={() => {
                // Empty upcoming days open straight into ranked suggestions.
                setSuggestOnOpen(
                  getEntriesForDate(date).length === 0 && date.getTime() >= today.getTime()
                );
                setSelectedDay(date);
              }}
              todayRef={toDateInputValue(date) === anchorKey ? todayRefCallback : undefined}
            />
          ))}
        </div>
      )}

      <div ref={bottomSentinelRef} data-testid="food-plan-bottom-sentinel" aria-hidden="true" />

      {selectedDay && (
        <DayManagementDialog
          date={selectedDay}
          entries={selectedDayEntries}
          note={selectedDayNote}
          recipes={recipes}
          onClose={() => setSelectedDay(null)}
          showSuggestionsOnOpen={suggestOnOpen}
        />
      )}

      {showShoppingListDialog && (
        <AddToShoppingListDialog
          today={today}
          recipes={recipes}
          onClose={() => setShowShoppingListDialog(false)}
        />
      )}

      {/* Floating back-to-today button — fades in when today is scrolled out of view.
          Bottom left: the bottom-right corner is the floating action button's. */}
      <button
        onClick={scrollToToday}
        aria-label="Scroll to today"
        className={`fixed bottom-6 left-4 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          isTodayVisible ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        I dag
      </button>
    </div>
  );
}
