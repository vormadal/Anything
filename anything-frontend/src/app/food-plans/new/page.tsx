"use client";

import { Button } from "@/components/ui/button";
import { useCreateFoodPlan } from "@/hooks/useFoodPlans";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function NewFoodPlanPage() {
  const today = getMonday(new Date());
  const [name, setName] = useState(`Week of ${today.toLocaleDateString()}`);
  const [weekStart, setWeekStart] = useState(toDateInputValue(today));
  const createFoodPlan = useCreateFoodPlan();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newPlan = await createFoodPlan.mutateAsync({
        name,
        weekStart: new Date(weekStart + "T00:00:00Z"),
      });
      toast.success("Food plan created");
      if (newPlan?.id) {
        router.push(`/food-plans/${newPlan.id}`);
      } else {
        router.push("/food-plans");
      }
    } catch {
      toast.error("Failed to create food plan. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <button
          onClick={() => router.push("/food-plans")}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 block"
        >
          &larr; Back to Food Plans
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          New Food Plan
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
              Week Start (Monday)
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

          <Button
            type="submit"
            disabled={createFoodPlan.isPending}
            className="w-full"
          >
            {createFoodPlan.isPending ? "Creating..." : "Create Food Plan"}
          </Button>
        </form>
      </div>
    </div>
  );
}
