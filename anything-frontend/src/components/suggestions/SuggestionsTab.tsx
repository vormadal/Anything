"use client";

import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { MergeDuplicatesDialog } from "@/components/MergeDuplicatesDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAllRecommendations,
  useDeleteRecommendation,
  useUpdateRecommendation,
  useCreateRecommendation,
  useDeleteRecommendationsForList,
  useDeleteSharedRecommendations,
  useTransferRecommendations,
  useFindDuplicateRecommendations,
  type RecommendationFilters,
} from "@/hooks/useRecommendations";
import { useSuggestionCategories } from "@/hooks/useSuggestionCategories";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import { X, Pencil, Plus, Search, ChevronLeft, ChevronRight, Trash2, Combine, ArrowRightLeft } from "lucide-react";
import { useState, useMemo } from "react";
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

export function SuggestionsTab() {
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
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [createName, setCreateName] = useState("");
  const [createPreferredUnit, setCreatePreferredUnit] = useState("");

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
  const deleteForList = useDeleteRecommendationsForList();
  const deleteShared = useDeleteSharedRecommendations();
  const transferRecommendations = useTransferRecommendations();
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

  const currentList = useMemo(() => recs ?? [], [recs]);

  const filteredList = useMemo(
    () => fuzzyRank(currentList, searchQuery, (r) => r.name ?? ""),
    [currentList, searchQuery]
  );

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedList = filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedListName = selectedListId != null ? listNameById.get(selectedListId) : undefined;

  // Bulk scope actions (delete-all / move-all) operate on a single scope: either
  // "Shared" or one specific list. "All lists" is not a single scope, so the
  // actions stay visible but disabled — teaching that picking a scope enables them.
  const isSharedScope = listFilter === LIST_FILTER_SHARED;
  const hasScope = isSharedScope || selectedListId != null;
  const scopeSourceId: number | null = isSharedScope ? null : selectedListId ?? null;
  const scopeLabel = isSharedScope ? "Shared" : selectedListName ?? "this list";
  const deleteLabel = isSharedScope ? "Delete all shared" : selectedListId != null ? "Clear list" : "Delete all";
  const isBulkPending = deleteForList.isPending || deleteShared.isPending || transferRecommendations.isPending;

  // Move destinations: every scope except the current one (Shared + each list).
  const moveDestinations = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (!isSharedScope) options.push({ value: LIST_FILTER_SHARED, label: "Shared (all lists)" });
    for (const l of shoppingLists) {
      if (l.id != null && l.id !== selectedListId) options.push({ value: String(l.id), label: l.name ?? `List #${l.id}` });
    }
    return options;
  }, [isSharedScope, shoppingLists, selectedListId]);

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
    } catch {
      toast.error("Failed to update suggestion.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRecommendation.mutateAsync(id);
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
    } catch {
      toast.error("Failed to create suggestion.");
    }
  };

  const handleCancelCreate = () => {
    setCreateName("");
    setCreatePreferredUnit("");
    setShowCreateForm(false);
  };

  const handleDeleteScope = async () => {
    if (!hasScope) return;
    try {
      if (isSharedScope) {
        await deleteShared.mutateAsync();
      } else if (selectedListId != null) {
        await deleteForList.mutateAsync(selectedListId);
      }
      setShowClearDialog(false);
    } catch {
      toast.error("Failed to remove suggestions.");
    }
  };

  const openMoveDialog = () => {
    setMoveTarget(moveDestinations[0]?.value ?? "");
    setShowMoveDialog(true);
  };

  const handleMove = async () => {
    if (!hasScope || !moveTarget) return;
    const toShoppingListId = moveTarget === LIST_FILTER_SHARED ? null : Number(moveTarget);
    const destLabel = moveTarget === LIST_FILTER_SHARED ? "Shared" : listNameById.get(Number(moveTarget)) ?? "the list";
    try {
      const result = await transferRecommendations.mutateAsync({ fromShoppingListId: scopeSourceId, toShoppingListId });
      setShowMoveDialog(false);
      const moved = result?.moved ?? 0;
      const dropped = result?.dropped ?? 0;
      const droppedNote = dropped > 0 ? ` · ${dropped} duplicate${dropped === 1 ? "" : "s"} dropped` : "";
      toast.success(`Moved ${moved} suggestion${moved === 1 ? "" : "s"} to ${destLabel}${droppedNote}.`);
    } catch {
      toast.error("Failed to move suggestions.");
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
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Suggestions appear as autocomplete options in shopping lists.
        </p>
        <Button
          size="sm"
          onClick={() => setShowCreateForm((v) => !v)}
          aria-label="Create suggestion"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      <MergeDuplicatesDialog open={showMergeDialog} onOpenChange={setShowMergeDialog} />

      {/* Duplicate review — an explanatory banner so its purpose is obvious. */}
      <div
        className={`mb-4 flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${
          duplicateGroupCount > 0
            ? "border-amber-300 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-900/20"
            : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {duplicateGroupCount > 0
            ? `${duplicateGroupCount} possible duplicate ${
                duplicateGroupCount === 1 ? "group" : "groups"
              } found — review and merge them into one.`
            : "No possible duplicate suggestions found."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowMergeDialog(true)}
          disabled={duplicateGroupCount === 0}
          aria-label="Review duplicate suggestions"
          className={
            duplicateGroupCount > 0
              ? "shrink-0 border-amber-400 text-amber-700 hover:text-amber-800 dark:border-amber-500 dark:text-amber-300"
              : "shrink-0"
          }
        >
          <Combine className="h-4 w-4 mr-1" />
          Review duplicates
          <CountBadge count={duplicateGroupCount} />
        </Button>
      </div>

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

        {/* Bulk scope actions — always visible so they're discoverable; disabled
            (with a hint) until a single scope (a list or Shared) is selected. */}
        <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {hasScope
              ? `Bulk actions for ${scopeLabel}`
              : "Select a list or Shared above to move or delete its suggestions in bulk."}
          </p>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={openMoveDialog}
              disabled={!hasScope || isBulkPending || moveDestinations.length === 0}
              aria-label="Move all suggestions in this scope to another list"
            >
              <ArrowRightLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Move all to…</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowClearDialog(true)}
              disabled={!hasScope || isBulkPending}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
              aria-label="Delete all suggestions in this scope"
            >
              <Trash2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{deleteLabel}</span>
            </Button>
          </div>
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

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent aria-describedby="clear-list-description">
          <DialogHeader>
            <DialogTitle>
              {isSharedScope ? "Remove all shared suggestions?" : "Remove all suggestions for this list?"}
            </DialogTitle>
          </DialogHeader>
          <p id="clear-list-description" className="text-sm text-gray-600 dark:text-gray-400">
            {isSharedScope
              ? "This removes every shared suggestion (shown in all lists). List-specific suggestions are kept."
              : `This removes every suggestion that belongs specifically to “${scopeLabel}”. Shared suggestions (shown in every list) are kept.`}
          </p>
          <DialogFooter className="flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} disabled={isBulkPending}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteScope}
              disabled={isBulkPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent aria-describedby="move-suggestions-description">
          <DialogHeader>
            <DialogTitle>Move all suggestions</DialogTitle>
          </DialogHeader>
          <p id="move-suggestions-description" className="text-sm text-gray-600 dark:text-gray-400">
            Move every suggestion currently in <span className="font-medium">{scopeLabel}</span> to another
            scope. A suggestion whose name already exists in the destination is dropped.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Destination</span>
            <select
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
              aria-label="Move destination"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {moveDestinations.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter className="flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setShowMoveDialog(false)} disabled={isBulkPending}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={isBulkPending || !moveTarget}>
              Move suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
