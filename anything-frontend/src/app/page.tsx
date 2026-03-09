"use client";

import { Button } from "@/components/ui/button";
import { useFoodPlans, useFoodPlanEntries } from "@/hooks/useFoodPlans";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useRecipes } from "@/hooks/useRecipes";
import { useRouter } from "next/navigation";
import { CalendarDays, ShoppingCart, Plus, ChevronRight } from "lucide-react";
import type { FoodPlan } from "@/lib/api-client/models/index";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getTargetDate(): Date {
  const now = new Date();
  if (now.getHours() >= 18) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  return now;
}

function jsDayToPlanDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function findPlanForDate(plans: FoodPlan[], date: Date): FoodPlan | undefined {
  return plans.find((plan) => {
    if (!plan.weekStart) return false;
    const weekStart = new Date(plan.weekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const target = new Date(date);
    target.setHours(12, 0, 0, 0);
    return target >= weekStart && target <= weekEnd;
  });
}

export default function Home() {
  const router = useRouter();
  const targetDate = getTargetDate();
  const isShowingTomorrow = new Date().getHours() >= 18;
  const planDayOfWeek = jsDayToPlanDay(targetDate.getDay());

  const { data: plans, isLoading: plansLoading } = useFoodPlans();
  const { data: shoppingLists, isLoading: listsLoading } = useShoppingLists();
  const { data: recipes } = useRecipes();

  const currentPlan = plans ? findPlanForDate(plans, targetDate) : undefined;
  const { data: entries } = useFoodPlanEntries(currentPlan?.id ?? 0);

  const todayEntries = entries?.filter((e) => e.dayOfWeek === planDayOfWeek) ?? [];
  const topLists = shoppingLists?.slice(0, 5) ?? [];

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
          <div className="flex gap-1">
            {currentPlan && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/food-plans/${currentPlan.id}`)}
                className="text-xs"
              >
                Edit plan
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/food-plans")}
              className="text-xs"
            >
              All plans
            </Button>
          </div>
        </div>

        {plansLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
        ) : !currentPlan ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              No food plan for {isShowingTomorrow ? "tomorrow" : "today"}.
            </p>
            <Button size="sm" onClick={() => router.push("/food-plans/new")}>
              <Plus className="h-4 w-4 mr-1" />
              Create plan
            </Button>
          </div>
        ) : todayEntries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              No meals planned for {DAYS_OF_WEEK[planDayOfWeek]} in{" "}
              <span className="font-medium">{currentPlan.name}</span>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/food-plans/${currentPlan.id}`)}
            >
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
            <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
              From plan:{" "}
              <button
                onClick={() => router.push(`/food-plans/${currentPlan.id}`)}
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                {currentPlan.name}
              </button>
            </div>
          </div>
        )}
      </section>

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
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
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
