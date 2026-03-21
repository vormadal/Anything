"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useFoodPlanSettings, useUpdateFoodPlanSettings } from "@/hooks/useFoodPlans";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { toast } from "sonner";
import {
  ALL_DAYS,
  DEFAULT_ACTIVE_DAYS,
  bitmaskToDaySet,
  daySetToBitmask,
} from "@/lib/foodPlanUtils";

function SettingsForm({ initialActiveDays }: { initialActiveDays: number }) {
  const updateSettings = useUpdateFoodPlanSettings();
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    () => bitmaskToDaySet(initialActiveDays)
  );

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
    if (selectedDays.size === 0) return;
    try {
      await updateSettings.mutateAsync({
        activeDays: daySetToBitmask(selectedDays),
      });
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update settings. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Active days
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
        disabled={updateSettings.isPending || selectedDays.size === 0}
        className="w-full"
      >
        {updateSettings.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

export default function FoodPlanSettingsPage() {
  const { data: settings, isLoading } = useFoodPlanSettings();
  const { setLeftAction } = useHeaderActions();

  useEffect(() => {
    setLeftAction({ type: "back", href: "/food-plans" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Food Plan Settings</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Food Plan Settings
        </h2>
        <SettingsForm initialActiveDays={settings?.activeDays ?? DEFAULT_ACTIVE_DAYS} />
      </div>
    </div>
  );
}
