"use client";

import { PageTitle } from "@/components/PageTitle";
import { RecipeTagsTab } from "@/components/recipes/RecipeTagsTab";
import { RecipeImportExportTab } from "@/components/recipes/RecipeImportExportTab";
import { useCurrentUser } from "@/hooks/useAuth";
import { canManageHousehold } from "@/lib/roles";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Tags, ArrowDownUp } from "lucide-react";
import { useEffect } from "react";
import { useHeaderActions } from "@/context/PageActionsContext";

type TabId = "tags" | "import-export";

const TABS: { id: TabId; label: string; icon: typeof Tags }[] = [
  { id: "tags", label: "Tags", icon: Tags },
  { id: "import-export", label: "Import & Export", icon: ArrowDownUp },
];

function toTabId(value: string | null): TabId {
  return value === "import-export" ? value : "tags";
}

export default function RecipeTagsPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const householdId = typeof params.id === "string" ? params.id : "";
  const { getHouseholdRole, isLoading: householdsLoading } = useHouseholdContext();
  const { setLeftAction } = useHeaderActions();

  const activeTab = toTabId(searchParams.get("tab"));
  const basePath = `/households/${householdId}/recipes/tags`;

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

  const handleTabChange = (tab: TabId) => {
    router.replace(tab === "tags" ? basePath : `${basePath}?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Recipe Tags</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeTab === "tags" && <RecipeTagsTab />}
        {activeTab === "import-export" && <RecipeImportExportTab />}
      </div>
    </div>
  );
}
