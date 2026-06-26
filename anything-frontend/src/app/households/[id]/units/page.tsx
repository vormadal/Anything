"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
  useSeedDefaultUnits,
  useExportUnits,
  useImportUnits,
  type MeasurementUnit,
  type UnitExportData,
} from "@/hooks/useUnits";
import { isAdmin } from "@/lib/roles";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { X, Pencil, Plus, Search, Download, Upload, Sparkles } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useHeaderActions } from "@/context/PageActionsContext";

type UnitRowProps = {
  unit: MeasurementUnit;
  editingId: number | null;
  editName: string;
  onEditNameChange: (value: string) => void;
  onStartEdit: (unit: { id: number; name: string }) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isDeletePending: boolean;
  isUpdatePending: boolean;
};

function UnitRow({
  unit,
  editingId,
  editName,
  onEditNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isDeletePending,
  isUpdatePending,
}: UnitRowProps) {
  return (
    <li className="flex flex-col gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
      {editingId === unit.id ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            placeholder="Unit"
            aria-label="Unit name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
            <Button size="sm" onClick={() => onSaveEdit(unit.id!)} disabled={isUpdatePending}>Save</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-900 dark:text-white truncate">{unit.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEdit({ id: unit.id!, name: unit.name ?? "" })}
              aria-label="Edit unit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(unit.id!)}
              disabled={isDeletePending}
              aria-label="Delete unit"
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

export default function UnitsPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const params = useParams();
  const householdId = typeof params.id === "string" ? params.id : "";
  const { setLeftAction } = useHeaderActions();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: units, isLoading } = useUnits();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const seedDefaultUnits = useSeedDefaultUnits();
  const exportUnits = useExportUnits();
  const importUnits = useImportUnits();

  useEffect(() => {
    if (householdId) {
      setLeftAction({ type: "back", href: `/households/${householdId}` });
    }
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction, householdId]);

  const filteredList = useMemo(() => {
    const list = units ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((u) => u.name?.toLowerCase().includes(q));
  }, [units, searchQuery]);

  if (user && !isAdmin(user.role)) {
    router.push("/");
    return null;
  }

  const handleStartEdit = ({ id, name }: { id: number; name: string }) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await updateUnit.mutateAsync({ id, name: editName.trim() });
      setEditingId(null);
      toast.success("Unit updated.");
    } catch {
      toast.error("Failed to update unit.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUnit.mutateAsync(id);
      toast.success("Unit deleted.");
    } catch {
      toast.error("Failed to delete unit.");
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      await createUnit.mutateAsync(createName.trim());
      setCreateName("");
      setShowCreateForm(false);
      toast.success("Unit created.");
    } catch {
      toast.error("Failed to create unit.");
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await seedDefaultUnits.mutateAsync();
      toast.success("Common units added.");
    } catch {
      toast.error("Failed to add common units.");
    }
  };

  const handleExport = async () => {
    try {
      await exportUnits.mutateAsync();
      toast.success("Units exported.");
    } catch {
      toast.error("Failed to export units.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as UnitExportData;
      await importUnits.mutateAsync(data);
      toast.success("Units imported.");
    } catch {
      toast.error("Failed to import units.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg">
      <PageTitle>Units</PageTitle>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Units appear as autocomplete options for recipes and shopping lists.
          </p>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={exportUnits.isPending}
              aria-label="Export units"
            >
              <Download className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportClick}
              disabled={importUnits.isPending}
              aria-label="Import units"
            >
              <Upload className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm((v) => !v)}
              aria-label="Create unit"
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
              placeholder="Unit"
              aria-label="New unit name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setCreateName(""); setShowCreateForm(false); }}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!createName.trim() || createUnit.isPending}
                aria-label="Save new unit"
              >
                Save
              </Button>
            </div>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search units..."
            aria-label="Search units"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {isLoading ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Loading...</p>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center gap-3">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {searchQuery.trim() ? "No units match your search." : "No units yet."}
            </p>
            {!searchQuery.trim() && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeedDefaults}
                disabled={seedDefaultUnits.isPending}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Add common units
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {filteredList.map((unit) => (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  editingId={editingId}
                  editName={editName}
                  onEditNameChange={setEditName}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={handleSaveEdit}
                  onDelete={handleDelete}
                  isDeletePending={deleteUnit.isPending}
                  isUpdatePending={updateUnit.isPending}
                />
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSeedDefaults}
                disabled={seedDefaultUnits.isPending}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Add common units
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
