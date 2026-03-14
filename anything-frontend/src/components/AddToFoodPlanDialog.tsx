"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAddFoodPlanEntry } from "@/hooks/useFoodPlans";
import { toast } from "sonner";
import type { Recipe } from "@/lib/api-client/models/index";
import { toDateInputValue } from "@/lib/foodPlanUtils";

interface AddToFoodPlanDialogProps {
  recipe: Recipe;
  onClose: () => void;
}

export function AddToFoodPlanDialog({ recipe, onClose }: AddToFoodPlanDialogProps) {
  const addEntry = useAddFoodPlanEntry();
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));

  const handleSubmit = async () => {
    if (!selectedDate) return;
    try {
      await addEntry.mutateAsync({
        name: recipe.name || "Unnamed Recipe",
        recipeId: recipe.id,
        date: new Date(selectedDate + "T00:00:00Z"),
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || addEntry.isPending}
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
