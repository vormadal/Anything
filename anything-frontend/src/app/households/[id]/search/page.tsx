"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";
import { useSearchIndexOverview, useRebuildHouseholdSearchIndex } from "@/hooks/useSearch";
import { canManageHousehold } from "@/lib/roles";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { useHeaderActions } from "@/context/PageActionsContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";
import { Search, RefreshCw } from "lucide-react";

export default function HouseholdSearchIndexPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const params = useParams();
  const householdId = typeof params.id === "string" ? params.id : "";
  const { getHouseholdRole, isLoading: householdsLoading } = useHouseholdContext();
  const { setLeftAction } = useHeaderActions();
  const { data: overview, isLoading } = useSearchIndexOverview();
  const rebuildIndex = useRebuildHouseholdSearchIndex();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (householdId) {
      setLeftAction({ type: "back", href: `/households/${householdId}` });
    }
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction, householdId]);

  if (
    user &&
    !householdsLoading &&
    !canManageHousehold(getHouseholdRole(Number(householdId)))
  ) {
    router.push("/");
    return null;
  }

  const handleRebuild = async () => {
    try {
      const result = await rebuildIndex.mutateAsync();
      const count = result.indexed ?? 0;
      toast.success(`Rebuilt search index for ${count} item${count === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Failed to rebuild the search index.");
    }
  };

  const byType = overview?.byType ?? [];

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Search Index</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            What&apos;s currently searchable for your household through the home page search widget.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRebuild}
            disabled={rebuildIndex.isPending || !isOnline}
            title={isOnline ? undefined : "Rebuilding the index requires an internet connection"}
            aria-label="Rebuild search index"
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-1 ${rebuildIndex.isPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{rebuildIndex.isPending ? "Rebuilding..." : "Rebuild"}</span>
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Loading...</p>
        ) : !overview || overview.totalDocuments === 0 ? (
          <div className="text-center py-8">
            <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nothing indexed yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Total indexed</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{overview.totalDocuments}</span>
            </div>
            <ul className="space-y-2">
              {byType.map((entry) => (
                <li
                  key={entry.entityType}
                  className="flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md"
                >
                  <span className="text-sm text-gray-900 dark:text-white">{entry.entityType}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{entry.count}</span>
                </li>
              ))}
            </ul>
            {overview.lastIndexedOn && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Last updated {new Date(overview.lastIndexedOn).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
