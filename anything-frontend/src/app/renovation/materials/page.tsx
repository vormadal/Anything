"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { LoadErrorState } from "@/components/LoadErrorState";
import { loadFailure } from "@/lib/queryState";
import { FIELD_INPUT_CLASS } from "@/components/inventory/inventoryFormStyles";
import { ConfirmDeleteDialog } from "@/components/inventory/ConfirmDeleteDialog";
import { MaterialForm } from "@/components/renovation/materials/MaterialForm";
import { MaterialListItem } from "@/components/renovation/materials/MaterialListItem";
import {
  ALL_CATEGORIES,
  filterMaterials,
  materialCategories,
} from "@/components/renovation/materials/materialsView";
import {
  useCreateRenovationMaterial,
  useDeleteRenovationMaterial,
  useRenovationMaterials,
  useUpdateRenovationMaterial,
  type RenovationMaterialInput,
} from "@/hooks/useRenovation";
import type { RenovationMaterialResponse } from "@/lib/api-client/models/index";
import { cn } from "@/lib/utils";

const NEW_MATERIAL = "new" as const;
const MATERIALS_BACK_HREF = "/renovation";
const CHIP_BASE_CLASS = "h-11 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap";

/** Which row is open: a saved material's id, the new-material form, or nothing. */
type OpenRow = number | typeof NEW_MATERIAL | null;

export default function RenovationMaterialsPage() {
  const materialsQuery = useRenovationMaterials();
  const createMaterial = useCreateRenovationMaterial();
  const updateMaterial = useUpdateRenovationMaterial();
  const deleteMaterial = useDeleteRenovationMaterial();
  const { setHeaderActions, setLeftAction } = useHeaderActions();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [openRow, setOpenRow] = useState<OpenRow>(null);
  const [pendingDelete, setPendingDelete] = useState<RenovationMaterialResponse | null>(null);

  const materials = useMemo(() => materialsQuery.data ?? [], [materialsQuery.data]);
  const load = loadFailure(materialsQuery);
  const categories = useMemo(() => materialCategories(materials), [materials]);
  // A category whose last material was deleted falls back to All rather than hiding everything.
  const activeCategory =
    category === ALL_CATEGORIES || categories.includes(category) ? category : ALL_CATEGORIES;
  const visible = useMemo(
    () => filterMaterials(materials, query, activeCategory),
    [materials, query, activeCategory],
  );

  useEffect(() => {
    setLeftAction({ type: "back", href: MATERIALS_BACK_HREF });
    return () => setLeftAction({ type: "menu" });
  }, [setLeftAction]);

  useEffect(() => {
    setHeaderActions(
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpenRow(NEW_MATERIAL)}
        aria-label="Add material"
      >
        <Plus className="h-5 w-5" />
      </Button>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const toggleRow = (id: number) => setOpenRow((current) => (current === id ? null : id));

  const handleCreate = async (input: RenovationMaterialInput) => {
    try {
      await createMaterial.mutateAsync(input);
      setOpenRow(null);
    } catch {
      toast.error("Couldn't add material");
    }
  };

  const handleUpdate = async (id: number, input: RenovationMaterialInput) => {
    try {
      await updateMaterial.mutateAsync({ id, ...input });
      setOpenRow(null);
    } catch {
      toast.error("Couldn't save material");
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id ?? 0;
    try {
      await deleteMaterial.mutateAsync(id);
      setOpenRow((current) => (current === id ? null : current));
    } catch {
      toast.error("Couldn't delete material");
    } finally {
      setPendingDelete(null);
    }
  };

  const renderBody = () => {
    if (materialsQuery.isLoading) {
      return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading materials…</p>;
    }
    if (load.failed) {
      return (
        <LoadErrorState what="materials" onRetry={load.retry} isRetrying={load.isRetrying} />
      );
    }
    if (materials.length === 0 && openRow !== NEW_MATERIAL) {
      return (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          No materials yet. Add one to start your price list.
        </p>
      );
    }
    return (
      <>
        <div className="flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Filter by category">
          {[ALL_CATEGORIES, ...categories].map((name) => {
            const selected = name === activeCategory;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(name)}
                className={cn(
                  CHIP_BASE_CLASS,
                  selected
                    ? "border-gray-900 bg-gray-900 text-gray-50 dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                )}
              >
                {name}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          {openRow === NEW_MATERIAL && (
            <div className="border-b border-gray-100 dark:border-gray-700">
              <MaterialForm
                categories={categories}
                isPending={createMaterial.isPending}
                onSave={handleCreate}
                onCancel={() => setOpenRow(null)}
              />
            </div>
          )}
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No materials match.
            </p>
          ) : (
            <ul>
              {visible.map((material) => {
                const id = material.id ?? 0;
                const expanded = openRow === id;
                return (
                  <MaterialListItem
                    key={id}
                    material={material}
                    expanded={expanded}
                    onToggle={() => toggleRow(id)}
                  >
                    <MaterialForm
                      material={material}
                      categories={categories}
                      isPending={updateMaterial.isPending || deleteMaterial.isPending}
                      onSave={(input) => handleUpdate(id, input)}
                      onCancel={() => setOpenRow(null)}
                      onDelete={() => setPendingDelete(material)}
                    />
                  </MaterialListItem>
                );
              })}
            </ul>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
      <PageTitle>Materials</PageTitle>

      <div className="relative">
        <label htmlFor="material-search" className="sr-only">
          Search materials
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          id="material-search"
          type="search"
          placeholder="Search materials"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${FIELD_INPUT_CLASS} h-11 pl-9`}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Changing a default doesn&apos;t re-price existing lines. A line keeps the price it was given
        when its material was chosen.
      </p>

      {renderBody()}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        title="Delete material?"
        message={`“${pendingDelete?.name ?? ""}” will be removed from the price list.`}
        isPending={deleteMaterial.isPending}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </div>
  );
}
