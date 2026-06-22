"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useSharedRecipe, useCloneSharedRecipe } from "@/hooks/useRecipeShares";
import { useIsAuthenticated } from "@/hooks/useAuth";
import { useHouseholds } from "@/hooks/useHouseholds";
import { getUser } from "@/hooks/useAuth";

export default function SharedRecipePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const isAuthenticated = useIsAuthenticated();
  const { data: recipe, isLoading, isError } = useSharedRecipe(token);
  const { data: households = [] } = useHouseholds();
  const cloneRecipe = useCloneSharedRecipe(token);

  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(null);

  const currentUser = getUser();
  const isTargetUser =
    recipe?.isTargeted &&
    isAuthenticated &&
    currentUser?.email?.toLowerCase() === recipe?.targetEmail?.toLowerCase();

  const effectiveHouseholdId = selectedHouseholdId ?? households[0]?.id ?? null;

  const handleClone = async () => {
    if (!effectiveHouseholdId) return;
    try {
      const result = await cloneRecipe.mutateAsync(effectiveHouseholdId);
      toast.success("Recipe copied to your recipes!");
      router.push(`/recipes/${result.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to copy recipe";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading recipe…</p>
        </div>
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-3">
          <ClipboardList className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Link not found</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            This share link doesn&apos;t exist or the recipe has been removed.
          </p>
        </div>
      </div>
    );
  }

  if (recipe.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-3">
          <ClipboardList className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Link expired</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            <strong>{recipe.recipeName}</strong> was shared with you but this link has expired.
            Ask the sender to generate a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`max-w-3xl mx-auto px-4 py-8 space-y-6${isTargetUser ? " pb-24" : ""}`}>
        {/* Header */}
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <ChefHat className="h-4 w-4" />
            Shared recipe
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{recipe.recipeName}</h1>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Image */}
        {recipe.imageUrls.length > 0 && (
          <div className="rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={recipe.imageUrls[0]}
              alt={recipe.recipeName}
              className="w-full h-56 sm:h-72 object-cover"
            />
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {recipe.cookTimeMinutes != null && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {recipe.cookTimeMinutes} min
            </span>
          )}
          {recipe.servings != null && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {recipe.servings} {recipe.servingsType?.toLowerCase() ?? "servings"}
            </span>
          )}
        </div>

        {/* Notes */}
        {recipe.notes && (
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{recipe.notes}</p>
        )}

        {/* Login prompt banner for targeted shares */}
        {recipe.isTargeted && !isAuthenticated && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-300">
            This recipe was shared with you.{" "}
            <a href={`/login?redirect=/shared/recipe/${token}`} className="font-semibold underline">
              Log in
            </a>{" "}
            to copy it to your recipes.
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ingredients</h2>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, idx) => (
                <li
                  key={idx}
                  className="flex items-baseline gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0 mt-1.5" />
                  <span>
                    {ing.amount != null && <span className="font-medium">{ing.amount} </span>}
                    {ing.unit && <span className="font-medium">{ing.unit} </span>}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Steps</h2>
            <ol className="space-y-3">
              {recipe.steps.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="flex-none w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {/* Sticky bottom bar for targeted-user copy action */}
      {isTargetUser && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            {households.length > 1 && (
              <select
                value={effectiveHouseholdId ?? ""}
                onChange={(e) => setSelectedHouseholdId(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select household"
              >
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              onClick={handleClone}
              disabled={cloneRecipe.isPending || !effectiveHouseholdId}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {cloneRecipe.isPending ? "Copying…" : "Copy to my recipes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
