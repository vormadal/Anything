"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { ExportSuggestionsDialog } from "@/components/ExportSuggestionsDialog";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useAllRecommendations,
  useUncategorizedRecommendations,
  useDeleteRecommendation,
  useUpdateRecommendation,
  useCreateRecommendation,
  useExportRecommendations,
  useImportRecommendations,
} from "@/hooks/useRecommendations";
import { useSuggestionCategories } from "@/hooks/useSuggestionCategories";
import { isAdmin } from "@/lib/roles";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X, Pencil, Plus, Search, ChevronLeft, ChevronRight, Download, Upload } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import type { SuggestionCategory } from "@/lib/api-client/models/index";

const PAGE_SIZE = 20;

type Tab = "all" | "uncategorized";

type Recommendation = {
  id?: number | null;
  name?: string | null;
  preferredUnit?: string | null;
  categoryId?: number | null;
};

type RecommendationRowProps = {
  rec: Recommendation;
  categories: SuggestionCategory[];
  showUncategorizedBadge: boolean;
  editingId: number | null;
  editName: string;
  editPreferredUnit: string;
  editCategoryId: number | null;
  onEditNameChange: (value: string) => void;
  onEditPreferredUnitChange: (value: string) => void;
  onEditCategoryIdChange: (value: number | null) => void;
  onStartEdit: (rec: { id: number; name: string; preferredUnit?: string | null; categoryId?: number | null }) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isDeletePending: boolean;
  isUpdatePending: boolean;
};

function RecommendationRow({
  rec,
  categories,
  showUncategorizedBadge,
  editingId,
  editName,
  editPreferredUnit,
  editCategoryId,
  onEditNameChange,
  onEditPreferredUnitChange,
  onEditCategoryIdChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isDeletePending,
  isUpdatePending,
}: RecommendationRowProps) {
  const categoryName = categories.find((c) => c.id === rec.categoryId)?.name;

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
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showUncategorizedBadge && !rec.categoryId && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Uncategorized
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEdit({ id: rec.id!, name: rec.name ?? "", preferredUnit: rec.preferredUnit, categoryId: rec.categoryId })}
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
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPreferredUnit, setEditPreferredUnit] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPreferredUnit, setCreatePreferredUnit] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allRecs, isLoading: isLoadingAll } = useAllRecommendations();
  const { data: uncategorizedRecs, isLoading: isLoadingUncategorized } = useUncategorizedRecommendations();
  const { data: categories = [] } = useSuggestionCategories();
  const deleteRecommendation = useDeleteRecommendation();
  const updateRecommendation = useUpdateRecommendation();
  const createRecommendation = useCreateRecommendation();
  const exportRecommendations = useExportRecommendations();
  const importRecommendations = useImportRecommendations();

  const currentList = useMemo(
    () => (activeTab === "uncategorized" ? (uncategorizedRecs ?? []) : (allRecs ?? [])),
    [activeTab, uncategorizedRecs, allRecs]
  );
  const isLoading = activeTab === "uncategorized" ? isLoadingUncategorized : isLoadingAll;

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase();
    return currentList.filter((r) => r.name?.toLowerCase().includes(q));
  }, [currentList, searchQuery]);

  if (user && !isAdmin(user.role)) {
    router.push("/");
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedList = filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleStartEdit = ({ id, name, preferredUnit, categoryId }: { id: number; name: string; preferredUnit?: string | null; categoryId?: number | null }) => {
    setEditingId(id);
    setEditName(name);
    setEditPreferredUnit(preferredUnit ?? "");
    setEditCategoryId(categoryId ?? null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await updateRecommendation.mutateAsync({
        id,
        name: editName.trim(),
        preferredUnit: editPreferredUnit.trim() || null,
        categoryId: editCategoryId,
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

  const handleExport = async (uncategorizedOnly: boolean) => {
    try {
      await exportRecommendations.mutateAsync({ uncategorizedOnly });
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
      const data = JSON.parse(text) as { recommendations: Array<{ name: string; preferredUnit?: string | null; category?: string | null }> };
      await importRecommendations.mutateAsync(data);
      toast.success("Suggestions imported.");
    } catch {
      toast.error("Failed to import suggestions.");
    } finally {
      e.target.value = "";
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setShowExportDialog(false);
    setSearchQuery("");
    setCurrentPage(1);
    setEditingId(null);
    setShowCreateForm(false);
    setCreateName("");
    setCreatePreferredUnit("");
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

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
        />

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

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleTabChange("uncategorized")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "uncategorized"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Uncategorized
            {(uncategorizedRecs?.length ?? 0) > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {uncategorizedRecs?.length}
              </span>
            )}
          </button>
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
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            {searchQuery.trim()
              ? "No suggestions match your search."
              : activeTab === "uncategorized"
              ? "No uncategorized suggestions."
              : "No suggestions yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {pagedList.map((rec) => (
              <RecommendationRow
                key={rec.id}
                rec={rec}
                categories={categories}
                showUncategorizedBadge={activeTab !== "uncategorized"}
                editingId={editingId}
                editName={editName}
                editPreferredUnit={editPreferredUnit}
                editCategoryId={editCategoryId}
                onEditNameChange={setEditName}
                onEditPreferredUnitChange={setEditPreferredUnit}
                onEditCategoryIdChange={setEditCategoryId}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onDelete={handleDelete}
                isDeletePending={deleteRecommendation.isPending}
                isUpdatePending={updateRecommendation.isPending}
              />
            ))}
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
    </div>
  );
}
