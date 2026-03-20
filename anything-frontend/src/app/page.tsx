"use client";

import { Button } from "@/components/ui/button";
import { useFoodPlanEntries } from "@/hooks/useFoodPlans";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useRecipes } from "@/hooks/useRecipes";
import { useBillSummary } from "@/hooks/useBills";
import { useRouter } from "next/navigation";
import { CalendarDays, ShoppingCart, Plus, ChevronRight, Receipt, Zap, Hand } from "lucide-react";
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

export default function Home() {
  const router = useRouter();
  const targetDate = getTargetDate();
  const isShowingTomorrow = new Date().getHours() >= 18;

  const dateStr = toDateInputValue(targetDate);
  const { data: entries, isLoading: entriesLoading } = useFoodPlanEntries(
    dateStr + "T00:00:00Z",
    dateStr + "T23:59:59Z"
  );
  const { data: shoppingLists, isLoading: listsLoading } = useShoppingLists();
  const { data: recipes } = useRecipes();
  const { data: billSummary } = useBillSummary();

  const todayEntries = entries ?? [];
  const topLists = shoppingLists?.slice(0, 5) ?? [];
  const dayName = DAYS_OF_WEEK[targetDate.getDay()];

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-6">
      {/* Menu of the Day */}
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
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </button>
                );
              }
              return (
                <div key={entry.id} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-gray-900 dark:text-white">{displayName}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bills summary */}
      {billSummary && billSummary.totalBills > 0 && (
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
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          </button>
        </section>
      )}

      {/* Shopping Lists */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Shopping Lists
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/shopping-lists")}
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
            <Button size="sm" onClick={() => router.push("/shopping-lists")}>
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
                onClick={() => router.push(`/shopping-lists/${list.id}`)}
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
                onClick={() => router.push("/shopping-lists")}
              >
                View all {shoppingLists?.length} lists →
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
