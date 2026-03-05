"use client";

import { Button } from "@/components/ui/button";
import { useFoodPlan, useUpdateFoodPlan } from "@/hooks/useFoodPlans";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
// Default: Mon–Fri (bits 0–4 set → 31)
const DEFAULT_ACTIVE_DAYS = 31;

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

function bitmaskToDaySet(bitmask: number): Set<number> {
  const days = new Set<number>();
  for (let i = 0; i < 7; i++) {
    if ((bitmask >> i) & 1) days.add(i);
  }
  return days;
}

function daySetToBitmask(days: Set<number>): number {
  let bitmask = 0;
  for (const d of days) bitmask |= 1 << d;
  return bitmask;
}

export default function EditFoodPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);

  const { data: plan, isLoading } = useFoodPlan(planId);
  const updateFoodPlan = useUpdateFoodPlan();

  const [name, setName] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (plan && !initialized) {
      setName(plan.name ?? "");
      setWeekStart(
        plan.weekStart ? toDateInputValue(new Date(plan.weekStart)) : ""
      );
      setSelectedDays(bitmaskToDaySet(plan.activeDays ?? DEFAULT_ACTIVE_DAYS));
      setInitialized(true);
    }
  }, [plan, initialized]);

  const toggleDay = (index: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !weekStart || selectedDays.size === 0) return;

    try {
      await updateFoodPlan.mutateAsync({
        id: planId,
        name,
        weekStart: new Date(weekStart + "T00:00:00Z"),
        activeDays: daySetToBitmask(selectedDays),
      });
      toast.success("Food plan updated");
      router.push(`/food-plans/${planId}`);
    } catch {
      toast.error("Failed to update food plan. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-lg">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Food plan not found.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <button
          onClick={() => router.push(`/food-plans/${planId}`)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 block"
        >
          &larr; Back to Food Plan
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Edit Food Plan
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="plan-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              id="plan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Food plan name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              required
            />
          </div>

          <div>
            <label
              htmlFor="plan-week-start"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Start Date
            </label>
            <input
              id="plan-week-start"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Days to show
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day, index) => (
                <label
                  key={day}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer select-none transition-colors ${
                    selectedDays.has(index)
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedDays.has(index)}
                    onChange={() => toggleDay(index)}
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={updateFoodPlan.isPending || selectedDays.size === 0}
            className="w-full"
          >
            {updateFoodPlan.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
