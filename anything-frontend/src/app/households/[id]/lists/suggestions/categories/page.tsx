"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useSuggestionCategories,
  useCreateSuggestionCategory,
  useUpdateSuggestionCategory,
  useDeleteSuggestionCategory,
  useReorderSuggestionCategories,
  useExportSuggestionCategories,
  useImportSuggestionCategories,
} from "@/hooks/useSuggestionCategories";
import { canManageHousehold } from "@/lib/roles";
import { useHouseholdContext } from "@/context/HouseholdContext";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { X, Pencil, Plus, GripVertical, Download, Upload } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useHeaderActions } from "@/context/PageActionsContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SuggestionCategory } from "@/lib/api-client/models/index";

function DraggableCategoryItem({
  category,
  onEdit,
  onDelete,
  isDeletePending,
}: {
  category: SuggestionCategory;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  isDeletePending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id ?? 0 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        className="flex items-center justify-center p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <span className="text-gray-900 dark:text-white font-medium text-sm">{category.name}</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(category.id!, category.name ?? "")}
            aria-label="Edit category"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(category.id!)}
            disabled={isDeletePending}
            aria-label="Delete category"
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const params = useParams();
  const householdId = typeof params.id === "string" ? params.id : "";
  const { getHouseholdRole, isLoading: householdsLoading } = useHouseholdContext();
  const { setLeftAction } = useHeaderActions();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [], isLoading } = useSuggestionCategories();
  const createCategory = useCreateSuggestionCategory();
  const updateCategory = useUpdateSuggestionCategory();
  const deleteCategory = useDeleteSuggestionCategory();
  const reorderCategories = useReorderSuggestionCategories();
  const exportCategories = useExportSuggestionCategories();
  const importCategories = useImportSuggestionCategories();

  useEffect(() => {
    if (householdId) {
      setLeftAction({ type: "back", href: `/households/${householdId}` });
    }
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction, householdId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (
    user &&
    !householdsLoading &&
    !canManageHousehold(getHouseholdRole(Number(householdId)))
  ) {
    router.push("/");
    return null;
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    reorderCategories.mutate(reordered.map((c) => c.id ?? 0));
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      await createCategory.mutateAsync(createName.trim());
      setCreateName("");
      setShowCreateForm(false);
      toast.success("Category created.");
    } catch {
      toast.error("Failed to create category.");
    }
  };

  const handleStartEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateCategory.mutateAsync({ id: editingId, name: editName.trim() });
      setEditingId(null);
      toast.success("Category updated.");
    } catch {
      toast.error("Failed to update category.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted.");
    } catch {
      toast.error("Failed to delete category.");
    }
  };

  const handleExport = async () => {
    try {
      await exportCategories.mutateAsync();
      toast.success("Categories exported.");
    } catch {
      toast.error("Failed to export categories.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { categories: Array<{ name: string }> };
      await importCategories.mutateAsync(data);
      toast.success("Categories imported.");
    } catch {
      toast.error("Failed to import categories.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Suggestion Categories</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drag to reorder categories.
          </p>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={exportCategories.isPending}
              aria-label="Export categories"
            >
              <Download className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportClick}
              disabled={importCategories.isPending}
              aria-label="Import categories"
            >
              <Upload className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm((v) => !v)}
              aria-label="Create category"
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

        {showCreateForm && (
          <div className="mb-4 p-3 border border-blue-200 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-blue-900/20 flex flex-col gap-2">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Category name"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(false); setCreateName(""); }}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!createName.trim() || createCategory.isPending}
                aria-label="Save new category"
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {editingId !== null && (
          <div className="mb-4 p-3 border border-green-200 dark:border-green-700 rounded-md bg-green-50 dark:bg-green-900/20 flex flex-col gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Category name"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editName.trim() || updateCategory.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            No categories yet. Create one to get started.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.id ?? 0)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {categories.map((category) => (
                  <DraggableCategoryItem
                    key={category.id}
                    category={category}
                    onEdit={handleStartEdit}
                    onDelete={handleDelete}
                    isDeletePending={deleteCategory.isPending}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
