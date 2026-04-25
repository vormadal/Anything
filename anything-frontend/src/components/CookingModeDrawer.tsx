"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCookingMode } from "@/context/CookingModeContext";
import { Button } from "@/components/ui/button";
import { ChefHat, X } from "lucide-react";

export function CookingModeDrawer() {
  const { session, stopCooking, completedStepIds } = useCookingMode();
  const pathname = usePathname();
  const router = useRouter();

  if (!session) return null;

  const isOnRecipePage = pathname === `/recipes/${session.recipeId}`;
  if (isOnRecipePage) return null;

  const completedCount = completedStepIds.size;
  const totalSteps = session.steps.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="bg-orange-600 dark:bg-orange-700 text-white rounded-xl shadow-lg p-3 flex items-center gap-3 pointer-events-auto">
        <ChefHat className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{session.recipeName}</p>
          {totalSteps > 0 && (
            <p className="text-xs text-orange-200">
              {completedCount}/{totalSteps} steps done
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="shrink-0 bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={() => router.push(`/recipes/${session.recipeId}`)}
        >
          Return
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-white hover:bg-white/20 h-8 w-8"
          onClick={stopCooking}
          aria-label="Stop cooking mode"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
