"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import { useCurrentUser } from "@/hooks/useAuth";
import { useSearchIndexOverview } from "@/hooks/useSearch";
import { canManageHousehold } from "@/lib/roles";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { useHeaderActions } from "@/context/PageActionsContext";
import { Search } from "lucide-react";

export default function HouseholdSearchIndexPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const params = useParams();
  const householdId = typeof params.id === "string" ? params.id : "";
  const { getHouseholdRole, isLoading: householdsLoading } = useHouseholdContext();
  const { setLeftAction } = useHeaderActions();
  const { data: overview, isLoading } = useSearchIndexOverview();

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

  const byType = overview?.byType ?? [];

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Search Index</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          What&apos;s currently searchable for your household through the home page search widget.
        </p>

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
