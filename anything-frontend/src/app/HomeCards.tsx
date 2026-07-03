"use client";

import { Button } from "@/components/ui/button";
import { useFoodPlanEntries, useFoodPlanNotes } from "@/hooks/useFoodPlans";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useRecipes } from "@/hooks/useRecipes";
import { useBillSummary } from "@/hooks/useBills";
import { useRouter } from "next/navigation";
import { CalendarDays, LayoutList, Plus, ChevronRight, Receipt, Zap, Hand } from "lucide-react";
import { CountBadge } from "@/components/ui/count-badge";
import { toDateInputValue } from "@/lib/foodPlanUtils";

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

export function BillsCard() {
  const router = useRouter();
  const { data: billSummary } = useBillSummary();

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
          onClick={() => router.push("/bills")}
          className="text-xs"
        >
          All bills
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

export function ListsCard() {
  const router = useRouter();
  const { data: shoppingLists, isLoading: listsLoading } = useShoppingLists();
  const topLists = shoppingLists?.slice(0, 5) ?? [];

  return (
    <section>
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
          onClick={() => router.push("/lists")}
          className="text-xs"
        >
          All lists
        </Button>
      </div>

      {listsLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      ) : topLists.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No shopping lists yet.</p>
          <Button size="sm" onClick={() => router.push("/lists")}>
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

export const HOME_CARD_KEYS = {
  FoodPlan: "foodplan",
  Bills: "bills",
  Lists: "lists",
} as const;

export type HomeCardKey = (typeof HOME_CARD_KEYS)[keyof typeof HOME_CARD_KEYS];

export const HOME_CARD_REGISTRY: Record<HomeCardKey, { title: string; component: React.ComponentType }> = {
  [HOME_CARD_KEYS.FoodPlan]: { title: "Menu of the Day", component: FoodPlanCard },
  [HOME_CARD_KEYS.Bills]: { title: "Bills", component: BillsCard },
  [HOME_CARD_KEYS.Lists]: { title: "Lists", component: ListsCard },
};

export const DEFAULT_HOME_CARD_ORDER: HomeCardKey[] = [
  HOME_CARD_KEYS.FoodPlan,
  HOME_CARD_KEYS.Bills,
  HOME_CARD_KEYS.Lists,
];
