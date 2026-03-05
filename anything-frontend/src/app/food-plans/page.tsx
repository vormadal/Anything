"use client";

import { Button } from "@/components/ui/button";
import { useFoodPlans, useDeleteFoodPlan } from "@/hooks/useFoodPlans";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { Plus, Pencil, Check, Trash2, CalendarDays, Settings } from "lucide-react";

function formatWeekRange(weekStart: Date | null | undefined): string {
  if (!weekStart) return "";
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
}

export default function FoodPlansPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const { data: plans, isLoading, error } = useFoodPlans();
  const deletePlan = useDeleteFoodPlan();
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  const handleDeletePlan = async (id: number) => {
    try {
      await deletePlan.mutateAsync(id);
      toast.success("Food plan deleted");
    } catch {
      toast.error("Failed to delete food plan. Please try again.");
    }
  };

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant={isEditMode ? "default" : "ghost"}
          size="icon"
          onClick={() => setIsEditMode(!isEditMode)}
          aria-label={isEditMode ? "Done editing" : "Edit plans"}
        >
          {isEditMode ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
        </Button>
        {!isEditMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/food-plans/new")}
            aria-label="Create food plan"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>
    );
    return () => setHeaderActions(null);
  }, [isEditMode, setHeaderActions, router]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          Failed to load food plans. Make sure the API is running.
        </div>
      )}

      {plans && plans.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p>No food plans yet.</p>
          <Button
            className="mt-4"
            onClick={() => router.push("/food-plans/new")}
          >
            Create your first food plan
          </Button>
        </div>
      )}

      {plans && plans.length > 0 && (
        <div className="space-y-1">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center gap-2">
              <button
                type="button"
                className="flex-1 flex flex-col px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  if (!isEditMode) router.push(`/food-plans/${plan.id}`);
                }}
              >
                <span className="text-gray-900 dark:text-white font-medium text-sm">
                  {plan.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatWeekRange(plan.weekStart)}
                </span>
              </button>
              {isEditMode && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/food-plans/${plan.id}/edit`)}
                    className="shrink-0"
                    aria-label="Edit food plan"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePlan(plan.id!)}
                    disabled={deletePlan.isPending}
                    className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Delete food plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
