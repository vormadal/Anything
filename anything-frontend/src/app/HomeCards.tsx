"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFoodPlanEntries, useFoodPlanNotes } from "@/hooks/useFoodPlans";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useRecipes } from "@/hooks/useRecipes";
import { useBillSummary } from "@/hooks/useBills";
import { useSearch, type SearchResultResponse } from "@/hooks/useSearch";
import { useNotes } from "@/hooks/useNotes";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter } from "next/navigation";
import { CalendarDays, LayoutList, Plus, ChevronRight, Receipt, Zap, Hand, BookOpen, UtensilsCrossed, ListChecks, Search as SearchIcon, X, Package, AlertCircle, NotebookPen } from "lucide-react";
import { CountBadge } from "@/components/ui/count-badge";
import { toDateInputValue } from "@/lib/foodPlanUtils";
import { CreateListDialog } from "@/components/CreateListDialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Maps a search result's entityType to its detail-page route. Entity types not
// listed here (e.g. InventoryItem, which has no frontend page yet) render as
// non-navigable rows instead of a broken link.
const SEARCH_RESULT_ROUTES: Record<string, (entityId: number) => string> = {
  Recipe: (entityId) => `/recipes/${entityId}`,
  ShoppingList: (entityId) => `/lists/${entityId}`,
  Note: (entityId) => `/notes/${entityId}`,
};

// Icon shown per result row, matching the icons already used for these entity
// types elsewhere (QuickCreateCard's Recipe/List shortcuts).
const SEARCH_RESULT_ICONS: Record<string, typeof BookOpen> = {
  Recipe: BookOpen,
  ShoppingList: ListChecks,
  InventoryItem: Package,
  Note: NotebookPen,
};

function getTargetDate(): Date {
  const now = new Date();
  if (now.getHours() >= 18) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  return now;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function FoodPlanCard() {
  const router = useRouter();
  const targetDate = getTargetDate();
  const isShowingTomorrow = new Date().getHours() >= 18;

  const dateStr = toDateInputValue(targetDate);
  const { data: entries, isLoading: entriesLoading } = useFoodPlanEntries(
    dateStr + "T00:00:00Z",
    dateStr + "T23:59:59Z"
  );
  const { data: notes } = useFoodPlanNotes(
    dateStr + "T00:00:00Z",
    dateStr + "T23:59:59Z"
  );
  const { data: recipes } = useRecipes();

  const todayEntries = entries ?? [];
  const todayNote = notes?.[0] ?? null;
  const dayName = DAYS_OF_WEEK[targetDate.getDay()];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isShowingTomorrow ? "Tomorrow's Menu" : "Today's Menu"}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/food-plans")}
          className="text-xs"
        >
          Food plan
        </Button>
      </div>

      {entriesLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      ) : todayEntries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No meals planned for {dayName}.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/food-plans")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add meals
          </Button>
          {todayNote?.note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              {todayNote.note}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {todayEntries.map((entry) => {
            const recipe = entry.recipeId ? recipes?.find((r) => r.id === entry.recipeId) : null;
            const displayName = recipe?.name ?? entry.name ?? "Unknown";
            if (entry.recipeId) {
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  onClick={() => router.push(`/recipes/${entry.recipeId}`)}
                >
                  <span className="text-sm text-gray-900 dark:text-white">{displayName}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                </button>
              );
            }
            return (
              <div key={entry.id} className="px-4 py-2.5">
                <span className="text-sm text-gray-900 dark:text-white">{displayName}</span>
              </div>
            );
          })}
          {todayNote?.note && (
            <div className="px-4 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">{todayNote.note}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function ListsCard() {
  const router = useRouter();
  const [isCreatingList, setIsCreatingList] = useState(false);
  const { data: shoppingLists, isLoading: listsLoading } = useShoppingLists();
  const isOnline = useOnlineStatus();
  const topLists = shoppingLists?.slice(0, 5) ?? [];

  return (
    <section>
      <CreateListDialog
        open={isCreatingList}
        onOpenChange={setIsCreatingList}
        onCreated={(listId) => router.push(`/lists/${listId}`)}
      />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LayoutList className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lists
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreatingList(true)}
          disabled={!isOnline}
          title={isOnline ? undefined : "Creating lists requires an internet connection"}
          className="text-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>

      {listsLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      ) : !isOnline && !shoppingLists ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You&apos;re offline — lists will appear once you&apos;re back online.
          </p>
        </div>
      ) : topLists.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No shopping lists yet.</p>
          <Button
            size="sm"
            onClick={() => setIsCreatingList(true)}
            disabled={!isOnline}
            title={isOnline ? undefined : "Creating lists requires an internet connection"}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create list
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {topLists.map((list) => (
            <button
              key={list.id}
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              onClick={() => router.push(`/lists/${list.id}`)}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">{list.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <CountBadge count={list.uncheckedItemCount} />
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
          {(shoppingLists?.length ?? 0) > 2 && (
            <button
              type="button"
              className="w-full px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => router.push("/lists")}
            >
              View all {shoppingLists?.length} lists →
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function BillsCard() {
  const router = useRouter();
  const { data: billSummary } = useBillSummary();
  const isOnline = useOnlineStatus();

  if (!billSummary || billSummary.totalBills === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bills</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/bills/new")}
          disabled={!isOnline}
          title={isOnline ? undefined : "Creating bills requires an internet connection"}
          className="text-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>
      <button
        type="button"
        className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
        onClick={() => router.push("/bills")}
      >
        <div className="space-y-1">
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {new Intl.NumberFormat("da-DK", {
              style: "currency",
              currency: "DKK",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Math.round(billSummary.totalMonthlyEquivalent))}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">/mo</span>
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-green-500" />
              {billSummary.automatedCount} auto
            </span>
            <span className="flex items-center gap-1">
              <Hand className="h-3 w-3 text-orange-400" />
              {billSummary.manualCount} manual
            </span>
            <span>{billSummary.totalBills} bills total</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-0.5">
            <span>
              {new Date().toLocaleString("default", { month: "short" })}:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(billSummary.totalCurrentMonthAmount))}
              </span>
            </span>
            <span>
              {new Date().getFullYear()}:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(billSummary.totalCurrentYearAmount))}
              </span>
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
      </button>
    </section>
  );
}

export function QuickCreateCard() {
  const router = useRouter();
  const [isCreatingList, setIsCreatingList] = useState(false);
  const isOnline = useOnlineStatus();
  const offlineTitle = isOnline ? undefined : "Creating requires an internet connection";

  const actions: { label: string; icon: typeof Plus; onClick: () => void }[] = [
    { label: "List", icon: ListChecks, onClick: () => setIsCreatingList(true) },
    { label: "Recipe", icon: BookOpen, onClick: () => router.push("/recipes/new") },
    { label: "Bill", icon: Receipt, onClick: () => router.push("/bills/new") },
    { label: "Meal", icon: UtensilsCrossed, onClick: () => router.push("/food-plans") },
  ];

  return (
    <section>
      <CreateListDialog
        open={isCreatingList}
        onOpenChange={setIsCreatingList}
        onCreated={(listId) => router.push(`/lists/${listId}`)}
      />
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Create</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            disabled={!isOnline}
            title={offlineTitle}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/50"
          >
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function GlobalSearchCard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);
  const hasQuery = debouncedQuery.trim().length > 0;
  const { data: results, isLoading, isError } = useSearch(debouncedQuery);

  const handleSelect = (result: SearchResultResponse) => {
    const toHref = result.entityType ? SEARCH_RESULT_ROUTES[result.entityType] : undefined;
    if (!toHref || result.entityId == null) return;
    router.push(toHref(result.entityId));
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <SearchIcon className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search</h2>
      </div>

      <div className="relative flex items-center mb-2">
        <SearchIcon className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes, lists, notes…"
          aria-label="Search everything"
          className="w-full pl-9 pr-9 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {hasQuery &&
        (isLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Searching...</div>
        ) : isError ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center flex flex-col items-center gap-1">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Search failed. Try again.</p>
          </div>
        ) : !results || results.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No results for &quot;{debouncedQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {results.map((result) => {
              const isNavigable = !!result.entityType && result.entityType in SEARCH_RESULT_ROUTES;
              const Icon = (result.entityType && SEARCH_RESULT_ICONS[result.entityType]) || SearchIcon;
              return (
                <button
                  key={`${result.entityType}-${result.entityId}`}
                  type="button"
                  disabled={!isNavigable}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                    {result.snippet && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.snippet}</p>
                    )}
                  </div>
                  {isNavigable && <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
    </section>
  );
}

const HOME_NOTES_LIMIT = 5;

export function NotesCard() {
  const router = useRouter();
  const { data: notes, isLoading } = useNotes(HOME_NOTES_LIMIT);
  const isOnline = useOnlineStatus();

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/notes/new")}
          disabled={!isOnline}
          title={isOnline ? undefined : "Creating notes requires an internet connection"}
          className="text-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      ) : !notes || notes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No notes yet. Jot down anything you want to keep.
          </p>
          <Button
            size="sm"
            onClick={() => router.push("/notes/new")}
            disabled={!isOnline}
            title={isOnline ? undefined : "Creating notes requires an internet connection"}
          >
            <Plus className="h-4 w-4 mr-1" />
            Write a note
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              onClick={() => router.push(`/notes/${note.id}`)}
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                  {note.title}
                </span>
                {note.snippet && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    {note.snippet}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            className="w-full px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={() => router.push("/notes")}
          >
            View all notes →
          </button>
        </div>
      )}
    </section>
  );
}

export const HOME_CARD_KEYS = {
  QuickCreate: "quickcreate",
  Search: "search",
  FoodPlan: "foodplan",
  Bills: "bills",
  Lists: "lists",
  Notes: "notes",
} as const;

export type HomeCardKey = (typeof HOME_CARD_KEYS)[keyof typeof HOME_CARD_KEYS];

export const HOME_CARD_REGISTRY: Record<HomeCardKey, { title: string; component: React.ComponentType }> = {
  [HOME_CARD_KEYS.QuickCreate]: { title: "Quick Create", component: QuickCreateCard },
  [HOME_CARD_KEYS.Search]: { title: "Search", component: GlobalSearchCard },
  [HOME_CARD_KEYS.FoodPlan]: { title: "Menu of the Day", component: FoodPlanCard },
  [HOME_CARD_KEYS.Notes]: { title: "Notes", component: NotesCard },
  [HOME_CARD_KEYS.Lists]: { title: "Lists", component: ListsCard },
  [HOME_CARD_KEYS.Bills]: { title: "Bills", component: BillsCard },
};

// Mirrors HomeCardKeys.All on the backend, which is what decides the order for
// a user who has never customised their home page — keep the two in step.
export const DEFAULT_HOME_CARD_ORDER: HomeCardKey[] = [
  HOME_CARD_KEYS.QuickCreate,
  HOME_CARD_KEYS.Search,
  HOME_CARD_KEYS.FoodPlan,
  HOME_CARD_KEYS.Notes,
  HOME_CARD_KEYS.Lists,
  HOME_CARD_KEYS.Bills,
];
