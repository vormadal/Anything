"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  ALL_DAYS,
  DEFAULT_ACTIVE_DAYS,
  bitmaskToDaySet,
  daySetToBitmask,
} from "@/lib/foodPlanUtils";

export type FoodPlanFormValues = {
  name: string;
  weekStart: string;
  activeDays: number;
};

type FoodPlanFormProps = {
  initialName: string;
  initialWeekStart: string;
  initialActiveDays?: number;
  onSubmit: (values: FoodPlanFormValues) => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
};

export function FoodPlanForm({
  initialName,
  initialWeekStart,
  initialActiveDays = DEFAULT_ACTIVE_DAYS,
  onSubmit,
  isPending,
  submitLabel,
  pendingLabel,
}: FoodPlanFormProps) {
  const [name, setName] = useState(initialName);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(bitmaskToDaySet(initialActiveDays));

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !weekStart || selectedDays.size === 0) return;
    onSubmit({ name, weekStart, activeDays: daySetToBitmask(selectedDays) });
  };

  return (
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
        disabled={isPending || selectedDays.size === 0}
        className="w-full"
      >
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
