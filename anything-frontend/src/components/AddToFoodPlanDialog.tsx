"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFoodPlans, useAddEntryToFoodPlan } from "@/hooks/useFoodPlans";
import { toast } from "sonner";
import type { Recipe } from "@/lib/api-client/models/index";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DEFAULT_ACTIVE_DAYS = 31;

function getActiveDaysFromBitmask(activeDays: number): { index: number; name: string }[] {
  return DAYS_OF_WEEK.map((name, index) => ({ index, name })).filter(
    ({ index }) => (activeDays >> index) & 1
  );
}

interface AddToFoodPlanDialogProps {
  recipe: Recipe;
  onClose: () => void;
}

export function AddToFoodPlanDialog({ recipe, onClose }: AddToFoodPlanDialogProps) {
  const { data: foodPlans, isLoading } = useFoodPlans();
  const addEntry = useAddEntryToFoodPlan();

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);

  const selectedPlan = foodPlans?.find((p) => p.id === selectedPlanId);
  const activeDays = selectedPlan
    ? getActiveDaysFromBitmask(selectedPlan.activeDays ?? DEFAULT_ACTIVE_DAYS)
    : [];

  const handlePlanChange = (planId: number | null) => {
    setSelectedPlanId(planId);
    setSelectedDayOfWeek(null);
  };

  const handleSubmit = async () => {
    if (!selectedPlanId || selectedDayOfWeek === null) return;
    try {
      await addEntry.mutateAsync({
        foodPlanId: selectedPlanId,
        name: recipe.name || "Unnamed Recipe",
        recipeId: recipe.id,
        dayOfWeek: selectedDayOfWeek,
      });
      toast.success("Added to food plan");
      onClose();
    } catch {
      toast.error("Failed to add to food plan. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add to Food Plan
        </h3>

        {isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            Loading food plans...
          </p>
        )}

        {!isLoading && (!foodPlans || foodPlans.length === 0) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No food plans found. Create a food plan first.
          </p>
        )}

        {foodPlans && foodPlans.length > 0 && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan
              </label>
              <select
                value={selectedPlanId ?? ""}
                onChange={(e) =>
                  handlePlanChange(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">Select a plan...</option>
                {foodPlans.map((plan) => (
                  <option key={plan.id} value={plan.id ?? ""}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            {activeDays.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Day
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {activeDays.map(({ index, name }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedDayOfWeek(index)}
                      className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                        selectedDayOfWeek === index
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 mt-2">
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlanId || selectedDayOfWeek === null || addEntry.isPending}
            className="flex-1"
          >
            {addEntry.isPending ? "Adding..." : "Add"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
