"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useFoodPlanSettings,
  useFoodPlanEntries,
  useFoodPlanNotes,
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
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { FoodPlanEntry, Recipe } from "@/lib/api-client/models/index";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Settings, CalendarDays, Sparkles, Plus } from "lucide-react";
import { bitmaskToDaySet, toDateInputValue, toUtcMidnight } from "@/lib/foodPlanUtils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { format, isSameDay, addDays as dateFnsAddDays } from "date-fns";
import { da } from "date-fns/locale";

const DEFAULT_ACTIVE_DAYS = 31;
const SUGGESTION_BLUR_DELAY_MS = 150;
const MAX_RANKED_SUGGESTIONS = 5;

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
      ref={isToday ? todayRef : undefined}
      aria-label={`${weekday}${relative ? `, ${relative}` : ""}`}
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
  recipes: Recipe[] | undefined;
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

  const suggestions = name.trim()
    ? (recipes ?? []).filter((r) => r.name?.toLowerCase().includes(name.toLowerCase()))
    : [];

  // Ranked suggestions from the backend, shown while the input is empty.
  const { data: rankedSuggestions } = useFoodPlanSuggestions(dateStr);
  const topSuggestions = (rankedSuggestions ?? []).slice(0, MAX_RANKED_SUGGESTIONS);
  const showRanked = showSuggestions && !name.trim() && topSuggestions.length > 0;
  const showNoRecipesHint =
    showSuggestions && !name.trim() && topSuggestions.length === 0 && recipes?.length === 0;

  const handleSelectSuggestion = (recipe: Recipe) => {
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
      toast.success("Entry added");
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
      toast.success("Entry added");
      setName("");
      setSelectedRecipeId(null);
    } catch {
      toast.error("Failed to add entry. Please try again.");
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success("Entry removed");
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

      toast.success("Saved");
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
  const isOnline = useOnlineStatus();

  const recipeEntries = (entries ?? []).filter((e) => e.recipeId != null);
  const uniqueRecipeIds = [...new Set(recipeEntries.map((e) => e.recipeId ?? 0))];
  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));

  const [multipliers, setMultipliers] = useState<Record<number, number>>(() =>
    Object.fromEntries(uniqueRecipeIds.map((id) => [id, 1]))
  );

  const setMultiplier = (recipeId: number, delta: number) => {
    setMultipliers((prev) => ({
      ...prev,
      [recipeId]: Math.max(0, (prev[recipeId] ?? 1) + delta),
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
                        disabled={(multipliers[recipeId] ?? 1) <= 0}
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
        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function FoodPlanPage() {
  const router = useRouter();
  const [weeksBack, setWeeksBack] = useState(1);
  const [weeksForward, setWeeksForward] = useState(1);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [suggestOnOpen, setSuggestOnOpen] = useState(false);
  const [showShoppingListDialog, setShowShoppingListDialog] = useState(false);
  const [isTodayVisible, setIsTodayVisible] = useState(true);
  const todayRef = useRef<HTMLButtonElement | null>(null);

  // Combined callback ref: updates todayRef for scrolling and sets up IntersectionObserver.
  // React 19 callback refs support returning a cleanup function, so this re-runs whenever
  // the today element attaches to the DOM (e.g. after data finishes loading).
  const todayRefCallback = useCallback(
    (el: HTMLButtonElement | null) => {
      todayRef.current = el;
      if (!el) return;

      // Scroll today into view immediately when it first attaches to the DOM
      // (data may not have been available at mount time, so we do this here instead of useEffect).
      const elementTop = el.getBoundingClientRect().top + window.scrollY;
      const offset = window.innerHeight * 0.25;
      window.scrollTo({ top: elementTop - offset, behavior: "instant" });

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

  const { data: settings } = useFoodPlanSettings();
  const { data: entries, isLoading } = useFoodPlanEntries(
    startDateStr + "T00:00:00Z",
    endDateStr + "T23:59:59Z"
  );
  const { data: notes } = useFoodPlanNotes(startDateStr, endDateStr);
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
          title={isOnline ? "Add all recipe ingredients to shopping list" : "Adding ingredients requires an internet connection"}
          disabled={!isOnline}
        >
          <ShoppingCart className="h-5 w-5" />
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, router, isOnline]);

  const selectedDayEntries = selectedDay ? getEntriesForDate(selectedDay) : [];
  const selectedDayNote = selectedDay ? getNoteForDate(selectedDay) : null;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <PageTitle>Food Plan</PageTitle>

      {/* Load earlier — starts above the viewport on initial load */}
      <div className="flex justify-center py-3">
        <Button variant="outline" size="sm" onClick={() => setWeeksBack((w) => w + 1)}>
          Load earlier
        </Button>
      </div>

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
              todayRef={todayRefCallback}
            />
          ))}
        </div>
      )}

      {/* Load more — starts below the viewport on initial load */}
      <div className="flex justify-center py-3">
        <Button variant="outline" size="sm" onClick={() => setWeeksForward((w) => w + 1)}>
          Load more
        </Button>
      </div>

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
          startDate={startDay}
          endDate={endDay}
          entries={entries}
          recipes={recipes}
          onClose={() => setShowShoppingListDialog(false)}
        />
      )}

      {/* Floating back-to-today button — fades in when today is scrolled out of view */}
      <button
        onClick={scrollToToday}
        aria-label="Scroll to today"
        className={`fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          isTodayVisible ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        I dag
      </button>
    </div>
  );
}
