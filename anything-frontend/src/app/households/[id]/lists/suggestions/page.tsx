"use client";

import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { PageTitle } from "@/components/PageTitle";
import { ExportSuggestionsDialog } from "@/components/ExportSuggestionsDialog";
import { MergeDuplicatesDialog } from "@/components/MergeDuplicatesDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useAllRecommendations,
  useDeleteRecommendation,
  useUpdateRecommendation,
  useCreateRecommendation,
  useExportRecommendations,
  useImportRecommendations,
  useDeleteRecommendationsForList,
  useFindDuplicateRecommendations,
  type RecommendationFilters,
} from "@/hooks/useRecommendations";
import { useSuggestionCategories } from "@/hooks/useSuggestionCategories";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { canManageHousehold } from "@/lib/roles";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { X, Pencil, Plus, Search, ChevronLeft, ChevronRight, Download, Upload, Trash2, Combine } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useHeaderActions } from "@/context/PageActionsContext";
import type { SuggestionCategory } from "@/lib/api-client/models/index";
import { fuzzyRank } from "@/lib/fuzzy";

const PAGE_SIZE = 20;
const SHOPPING_LIST_TYPE = 1;

// Special sentinel values for the list filter dropdown.
const LIST_FILTER_ALL = "all";
const LIST_FILTER_SHARED = "shared";

type SuggestionVisibility = "all" | "shown" | "hidden";

type Recommendation = {
  id?: number | null;
  name?: string | null;
  preferredUnit?: string | null;
  categoryId?: number | null;
  includeInSuggestions?: boolean | null;
  shoppingListId?: number | null;
};

type RecommendationRowProps = {
  rec: Recommendation;
  categories: SuggestionCategory[];
  listLabel: string;
  isShared: boolean;
  showUncategorizedMarker: boolean;
  editingId: number | null;
  editName: string;
  editPreferredUnit: string;
  editCategoryId: number | null;
  editIncludeInSuggestions: boolean;
  onEditNameChange: (value: string) => void;
  onEditPreferredUnitChange: (value: string) => void;
  onEditCategoryIdChange: (value: number | null) => void;
  onEditIncludeInSuggestionsChange: (value: boolean) => void;
  onStartEdit: (rec: { id: number; name: string; preferredUnit?: string | null; categoryId?: number | null; includeInSuggestions?: boolean | null }) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isDeletePending: boolean;
  isUpdatePending: boolean;
};

function RecommendationRow({
  rec,
  categories,
  listLabel,
  isShared,
  showUncategorizedMarker,
  editingId,
  editName,
  editPreferredUnit,
  editCategoryId,
  editIncludeInSuggestions,
  onEditNameChange,
  onEditPreferredUnitChange,
  onEditCategoryIdChange,
  onEditIncludeInSuggestionsChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isDeletePending,
  isUpdatePending,
}: RecommendationRowProps) {
  const categoryName = categories.find((c) => c.id === rec.categoryId)?.name;
  const isHidden = rec.includeInSuggestions === false;

  return (
    <li className="flex flex-col gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
      {editingId === rec.id ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <input
            type="text"
            value={editPreferredUnit}
            onChange={(e) => onEditPreferredUnitChange(e.target.value)}
            placeholder="Preferred unit (optional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={editCategoryId ?? ""}
            onChange={(e) => onEditCategoryIdChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id ?? ""}>
                {cat.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={editIncludeInSuggestions}
              onChange={(e) => onEditIncludeInSuggestionsChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
            />
            Show in autocomplete suggestions
          </label>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
            <Button size="sm" onClick={() => onSaveEdit(rec.id!)} disabled={isUpdatePending}>Save</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-gray-900 dark:text-white truncate">{rec.name}</span>
            {rec.preferredUnit && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{rec.preferredUnit}</span>
            )}
            {categoryName && (
              <span className="text-xs text-blue-600 dark:text-blue-400">{categoryName}</span>
            )}
            <span
              className={`mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs ${
                isShared
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              }`}
            >
              {listLabel}
            </span>
            {isHidden && (
              <span className="mt-1 inline-flex w-fit items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                From recipe · not suggested
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showUncategorizedMarker && !rec.categoryId && (
              <span
                className="h-2.5 w-2.5 rounded-full bg-yellow-400 dark:bg-yellow-300"
                title="Uncategorized"
                aria-label="Uncategorized"
                role="img"
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEdit({ id: rec.id!, name: rec.name ?? "", preferredUnit: rec.preferredUnit, categoryId: rec.categoryId, includeInSuggestions: rec.includeInSuggestions })}
              aria-label="Edit suggestion"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(rec.id!)}
              disabled={isDeletePending}
              aria-label="Delete suggestion"
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function SuggestionsPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const params = useParams();
  const householdId = typeof params.id === "string" ? params.id : "";
  const { getHouseholdRole, isLoading: householdsLoading } = useHouseholdContext();
  const { setLeftAction } = useHeaderActions();

  const [listFilter, setListFilter] = useState<string>(LIST_FILTER_ALL);
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<SuggestionVisibility>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPreferredUnit, setEditPreferredUnit] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editIncludeInSuggestions, setEditIncludeInSuggestions] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPreferredUnit, setCreatePreferredUnit] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedListId = /^\d+$/.test(listFilter) ? Number(listFilter) : undefined;

  const filters: RecommendationFilters = useMemo(
    () => ({
      shoppingListId: selectedListId,
      sharedOnly: listFilter === LIST_FILTER_SHARED ? true : undefined,
      uncategorized: uncategorizedOnly ? true : undefined,
      includeInSuggestions:
        visibilityFilter === "shown" ? true : visibilityFilter === "hidden" ? false : undefined,
    }),
    [selectedListId, listFilter, uncategorizedOnly, visibilityFilter]
  );

  const { data: recs, isLoading } = useAllRecommendations(filters);
  const { data: categories = [] } = useSuggestionCategories();
  const { data: allLists = [] } = useShoppingLists();
  const deleteRecommendation = useDeleteRecommendation();
  const updateRecommendation = useUpdateRecommendation();
  const createRecommendation = useCreateRecommendation();
  const exportRecommendations = useExportRecommendations();
  const importRecommendations = useImportRecommendations();
  const deleteForList = useDeleteRecommendationsForList();
  const { data: duplicateGroups } = useFindDuplicateRecommendations();

  const duplicateGroupCount = useMemo(
    () => (duplicateGroups ?? []).filter((g) => (g.members ?? []).length > 0).length,
    [duplicateGroups]
  );

  const shoppingLists = useMemo(
    () => allLists.filter((l) => l.type === SHOPPING_LIST_TYPE),
    [allLists]
  );
  const listNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of allLists) {
      if (l.id != null) map.set(l.id, l.name ?? `List #${l.id}`);
    }
    return map;
  }, [allLists]);

  useEffect(() => {
    if (householdId) {
      setLeftAction({ type: "back", href: `/households/${householdId}` });
    }
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction, householdId]);

  const currentList = useMemo(() => recs ?? [], [recs]);

  const filteredList = useMemo(
    () => fuzzyRank(currentList, searchQuery, (r) => r.name ?? ""),
    [currentList, searchQuery]
  );

  if (
    user &&
    !householdsLoading &&
    !canManageHousehold(getHouseholdRole(Number(householdId)))
  ) {
    router.push("/");
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedList = filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedListName = selectedListId != null ? listNameById.get(selectedListId) : undefined;

  const listLabelFor = (rec: Recommendation): { label: string; isShared: boolean } => {
    if (rec.shoppingListId == null) return { label: "Shared", isShared: true };
    return { label: listNameById.get(rec.shoppingListId) ?? `List #${rec.shoppingListId}`, isShared: false };
  };

  const handleStartEdit = ({ id, name, preferredUnit, categoryId, includeInSuggestions }: { id: number; name: string; preferredUnit?: string | null; categoryId?: number | null; includeInSuggestions?: boolean | null }) => {
    setEditingId(id);
    setEditName(name);
    setEditPreferredUnit(preferredUnit ?? "");
    setEditCategoryId(categoryId ?? null);
    setEditIncludeInSuggestions(includeInSuggestions !== false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;
    // Preserve the recommendation's list scope when editing other fields.
    const existing = currentList.find((r) => r.id === id);
    try {
      await updateRecommendation.mutateAsync({
        id,
        name: editName.trim(),
        preferredUnit: editPreferredUnit.trim() || null,
        categoryId: editCategoryId,
        includeInSuggestions: editIncludeInSuggestions,
        shoppingListId: existing?.shoppingListId ?? null,
      });
      setEditingId(null);
      toast.success("Suggestion updated.");
    } catch {
      toast.error("Failed to update suggestion.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRecommendation.mutateAsync(id);
      toast.success("Suggestion deleted.");
    } catch {
      toast.error("Failed to delete suggestion.");
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      await createRecommendation.mutateAsync({
        name: createName.trim(),
        preferredUnit: createPreferredUnit.trim() || null,
        // When a specific list is selected, new suggestions attach to it; otherwise shared.
        shoppingListId: selectedListId ?? null,
      });
      setCreateName("");
      setCreatePreferredUnit("");
      setShowCreateForm(false);
      toast.success("Suggestion created.");
    } catch {
      toast.error("Failed to create suggestion.");
    }
  };

  const handleCancelCreate = () => {
    setCreateName("");
    setCreatePreferredUnit("");
    setShowCreateForm(false);
  };

  const handleExport = async (uncategorized: boolean) => {
    try {
      await exportRecommendations.mutateAsync({ uncategorizedOnly: uncategorized });
      setShowExportDialog(false);
      toast.success("Suggestions exported.");
    } catch {
      toast.error("Failed to export suggestions.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        recommendations: Array<{
          name: string;
          preferredUnit?: string | null;
          category?: string | null;
          delete?: boolean;
        }>;
      };
      await importRecommendations.mutateAsync(data);
      toast.success("Suggestions imported.");
    } catch {
      toast.error("Failed to import suggestions.");
    } finally {
      e.target.value = "";
    }
  };

  const handleClearList = async () => {
    if (selectedListId == null) return;
    try {
      await deleteForList.mutateAsync(selectedListId);
      setShowClearDialog(false);
      toast.success("List suggestions removed.");
    } catch {
      toast.error("Failed to remove list suggestions.");
    }
  };

  const handleListFilterChange = (value: string) => {
    setListFilter(value);
    setCurrentPage(1);
    setEditingId(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const emptyMessage = searchQuery.trim()
    ? "No suggestions match your search."
    : uncategorizedOnly
    ? "No uncategorized suggestions."
    : "No suggestions yet.";

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Suggestions</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Suggestions appear as autocomplete options in shopping lists.
          </p>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              disabled={exportRecommendations.isPending}
              aria-label="Export suggestions"
            >
              <Download className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportClick}
              disabled={importRecommendations.isPending}
              aria-label="Import suggestions"
            >
              <Upload className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMergeDialog(true)}
              aria-label="Find duplicate suggestions"
              className={
                duplicateGroupCount > 0
                  ? "border-amber-400 text-amber-700 hover:text-amber-800 dark:border-amber-500 dark:text-amber-300"
                  : undefined
              }
            >
              <Combine className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Duplicates</span>
              <CountBadge count={duplicateGroupCount} />
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm((v) => !v)}
              aria-label="Create suggestion"
            >
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
        <ExportSuggestionsDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          isPending={exportRecommendations.isPending}
          onExportAll={() => handleExport(false)}
          onExportUncategorized={() => handleExport(true)}
          categoryNames={categories.map((c) => c.name ?? "").filter(Boolean)}
        />
        <MergeDuplicatesDialog open={showMergeDialog} onOpenChange={setShowMergeDialog} />

        {showCreateForm && (
          <div className="mb-4 p-3 border border-blue-200 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-blue-900/20 flex flex-col gap-2">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Name"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <input
              type="text"
              value={createPreferredUnit}
              onChange={(e) => setCreatePreferredUnit(e.target.value)}
              placeholder="Preferred unit (optional)"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedListName ? `Adds to: ${selectedListName}` : "Adds as: Shared (all lists)"}
            </p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={handleCancelCreate}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!createName.trim() || createRecommendation.isPending}
                aria-label="Save new suggestion"
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">List</span>
              <select
                value={listFilter}
                onChange={(e) => handleListFilterChange(e.target.value)}
                aria-label="Filter by list"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={LIST_FILTER_ALL}>All lists</option>
                <option value={LIST_FILTER_SHARED}>Shared (all lists)</option>
                {shoppingLists.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Autocomplete</span>
              <select
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(e.target.value as SuggestionVisibility);
                  setCurrentPage(1);
                }}
                aria-label="Filter by autocomplete visibility"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All</option>
                <option value="shown">In autocomplete</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={uncategorizedOnly}
                onChange={(e) => {
                  setUncategorizedOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              />
              Uncategorized only
            </label>
            {selectedListId != null && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowClearDialog(true)}
                disabled={deleteForList.isPending}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
                aria-label="Remove all suggestions for this list"
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear list</span>
              </Button>
            )}
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search suggestions..."
            aria-label="Search suggestions"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {isLoading ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Loading...</p>
        ) : pagedList.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {pagedList.map((rec) => {
              const { label, isShared } = listLabelFor(rec);
              return (
                <RecommendationRow
                  key={rec.id}
                  rec={rec}
                  categories={categories}
                  listLabel={label}
                  isShared={isShared}
                  showUncategorizedMarker={!uncategorizedOnly}
                  editingId={editingId}
                  editName={editName}
                  editPreferredUnit={editPreferredUnit}
                  editCategoryId={editCategoryId}
                  editIncludeInSuggestions={editIncludeInSuggestions}
                  onEditNameChange={setEditName}
                  onEditPreferredUnitChange={setEditPreferredUnit}
                  onEditCategoryIdChange={setEditCategoryId}
                  onEditIncludeInSuggestionsChange={setEditIncludeInSuggestions}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onDelete={handleDelete}
                  isDeletePending={deleteRecommendation.isPending}
                  isUpdatePending={updateRecommendation.isPending}
                />
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {safePage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent aria-describedby="clear-list-description">
          <DialogHeader>
            <DialogTitle>Remove all suggestions for this list?</DialogTitle>
          </DialogHeader>
          <p id="clear-list-description" className="text-sm text-gray-600 dark:text-gray-400">
            This removes every suggestion that belongs specifically to
            {selectedListName ? ` “${selectedListName}”` : " this list"}. Shared suggestions
            (shown in every list) are kept.
          </p>
          <DialogFooter className="flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} disabled={deleteForList.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleClearList}
              disabled={deleteForList.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
