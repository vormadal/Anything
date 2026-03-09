"use client";

import { useCreateFoodPlan } from "@/hooks/useFoodPlans";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useEffect } from "react";
import { FoodPlanForm, FoodPlanFormValues } from "../FoodPlanForm";
import { toDateInputValue } from "@/lib/foodPlanUtils";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function NewFoodPlanPage() {
  const today = getMonday(new Date());
  const createFoodPlan = useCreateFoodPlan();
  const router = useRouter();
  const { setLeftAction } = useHeaderActions();

  useEffect(() => {
    setLeftAction({ type: "back", href: "/food-plans" });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  const handleSubmit = async ({ name, weekStart, activeDays }: FoodPlanFormValues) => {
    try {
      const newPlan = await createFoodPlan.mutateAsync({
        name,
        weekStart: new Date(weekStart + "T00:00:00Z"),
        activeDays,
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          New Food Plan
        </h2>
        <FoodPlanForm
          initialName={`Week of ${today.toLocaleDateString()}`}
          initialWeekStart={toDateInputValue(today)}
          onSubmit={handleSubmit}
          isPending={createFoodPlan.isPending}
          submitLabel="Create Food Plan"
          pendingLabel="Creating..."
        />
      </div>
    </div>
  );
}
