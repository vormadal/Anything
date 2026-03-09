"use client";

import { useFoodPlan, useUpdateFoodPlan } from "@/hooks/useFoodPlans";
import { useSmartBack } from "@/hooks/useSmartBack";
import { FoodPlan } from "@/lib/api-client/models/index";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { FoodPlanForm, FoodPlanFormValues } from "../../FoodPlanForm";
import { DEFAULT_ACTIVE_DAYS, toDateInputValue } from "@/lib/foodPlanUtils";

function EditFoodPlanForm({ plan, planId }: { plan: FoodPlan; planId: number }) {
  const { navigateBack } = useSmartBack();
  const updateFoodPlan = useUpdateFoodPlan();

  const handleSubmit = async ({ name, weekStart, activeDays }: FoodPlanFormValues) => {
    try {
      await updateFoodPlan.mutateAsync({
        id: planId,
        name,
        weekStart: new Date(weekStart + "T00:00:00Z"),
        activeDays,
      });
      toast.success("Food plan updated");
      navigateBack(`/food-plans/${planId}`);
    } catch {
      toast.error("Failed to update food plan. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <button
          onClick={() => navigateBack(`/food-plans/${planId}`)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 block"
        >
          &larr; Back to Food Plan
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Edit Food Plan
        </h2>
        <FoodPlanForm
          initialName={plan.name ?? ""}
          initialWeekStart={plan.weekStart ? toDateInputValue(new Date(plan.weekStart)) : ""}
          initialActiveDays={plan.activeDays ?? DEFAULT_ACTIVE_DAYS}
          onSubmit={handleSubmit}
          isPending={updateFoodPlan.isPending}
          submitLabel="Save Changes"
          pendingLabel="Saving..."
        />
      </div>
    </div>
  );
}

export default function EditFoodPlanPage() {
  const params = useParams();
  const planId = Number(params.id);

  const { data: plan, isLoading } = useFoodPlan(planId);

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

  return <EditFoodPlanForm plan={plan} planId={planId} />;
}
