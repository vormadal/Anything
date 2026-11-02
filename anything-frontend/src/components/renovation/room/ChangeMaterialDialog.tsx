"use client";

import { useMemo, useState } from "react";
import type { RenovationLineResponse, RenovationMaterialResponse } from "@/lib/api-client/models/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadErrorState } from "@/components/LoadErrorState";
import {
  useCreateRenovationMaterial,
  useRenovationMaterials,
  useReplaceRenovationMaterial,
  useUpdateRenovationLine,
  type RenovationMaterialInput,
} from "@/hooks/useRenovation";
import { loadFailure } from "@/lib/queryState";
import { formatKr, formatQty, round2 } from "@/lib/renovation";
import { formatSignedKr } from "@/components/renovation/overview/overviewMath";
import { CreateMaterialForm } from "./CreateMaterialForm";
import {
  FIELD_ERROR_CLASS,
  GENERIC_ERROR_MESSAGE,
  costForMaterial,
  lineWithMaterial,
  varianceClass,
} from "./roomDisplay";

interface ChangeMaterialDialogProps {
  projectId: number;
  line: RenovationLineResponse;
  onClose: () => void;
}

type Scope = "room" | "all";

const SCOPE_CARD_CLASS =
  "flex min-h-[56px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm";
const SCOPE_ON_CLASS = `${SCOPE_CARD_CLASS} border-2 border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-700`;
const SCOPE_OFF_CLASS = `${SCOPE_CARD_CLASS} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`;
const OPTION_ROW_CLASS =
  "flex min-h-[56px] cursor-pointer items-start gap-3 border-t border-gray-100 dark:border-gray-700 px-3.5 py-3";
const MUTED_TEXT = "text-xs text-gray-500 dark:text-gray-400";

/**
 * Swaps the line's material. "This room" copies the material onto this line; "All rooms" replaces
 * the material on every line that uses the current one (lines already bought keep theirs).
 */
export function ChangeMaterialDialog({ projectId, line, onClose }: ChangeMaterialDialogProps) {
  const materialsQuery = useRenovationMaterials();
  const updateLine = useUpdateRenovationLine(projectId);
  const replaceMaterial = useReplaceRenovationMaterial(projectId);
  const createMaterial = useCreateRenovationMaterial();

  const [scope, setScope] = useState<Scope>("room");
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const materials = useMemo(() => materialsQuery.data ?? [], [materialsQuery.data]);
  const unit = line.unit ?? "";
  const currentMaterial = materials.find((m) => m.id === line.materialId);
  const currentName = currentMaterial?.name ?? line.description ?? line.label ?? "";
  const canReplaceAll = line.materialId !== null && line.materialId !== undefined;
  const effectiveScope: Scope = canReplaceAll ? scope : "room";
  const visible = materials
    .filter((m) => showAllUnits || (m.unit ?? "") === unit)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const selected = materials.find((m) => m.id === selectedId);
  const currentCost = line.estimate ?? 0;
  const newCost = selected ? costForMaterial(line, selected) : currentCost;
  const load = loadFailure(materialsQuery);

  const applyMaterial = async (material: RenovationMaterialResponse) => {
    if (effectiveScope === "all" && canReplaceAll) {
      const response = await replaceMaterial.mutateAsync({
        fromMaterialId: line.materialId ?? 0,
        toMaterialId: material.id ?? 0,
      });
      setResult(
        `${response?.updatedLines ?? 0} updated, ${response?.skippedPurchasedLines ?? 0} already bought kept`,
      );
      return;
    }
    await updateLine.mutateAsync(lineWithMaterial(line, material));
    onClose();
  };

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    }
  };

  const handleApply = () => {
    if (!selected) return;
    return runAction(() => applyMaterial(selected));
  };

  const handleCreate = (input: RenovationMaterialInput) =>
    runAction(async () => {
      const created = await createMaterial.mutateAsync(input);
      if (!created?.id) throw new Error("Material was not returned");
      await applyMaterial(created);
    });

  const renderOptions = () => {
    if (load.failed) return <LoadErrorState what="materials" onRetry={load.retry} isRetrying={load.isRetrying} />;
    if (materialsQuery.isLoading) return <p className={`${MUTED_TEXT} py-4 text-center`}>Loading materials…</p>;
    if (visible.length === 0) {
      return <p className={`${MUTED_TEXT} py-4 text-center`}>No {unit} materials in the library yet.</p>;
    }
    return visible.map((material) => {
      const cost = costForMaterial(line, material);
      const delta = round2(cost - currentCost);
      const isCurrent = material.id === line.materialId;
      const checked = material.id === selectedId;
      return (
        <label key={material.id} className={checked ? `${OPTION_ROW_CLASS} bg-gray-50 dark:bg-gray-700` : OPTION_ROW_CLASS}>
          <input
            type="radio"
            name="material"
            className="mt-0.5 h-[18px] w-[18px] shrink-0"
            checked={checked}
            onChange={() => setSelectedId(material.id ?? null)}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{material.name}</span>
            <span className={MUTED_TEXT}>
              {formatKr(material.defaultPrice ?? 0)}/{material.unit ?? "unit"}
              {material.productUrl ? " · product linked" : ""}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5 whitespace-nowrap">
            <span className="text-sm font-semibold">{formatKr(cost)}</span>
            <span className={isCurrent || delta === 0 ? MUTED_TEXT : `text-xs font-medium ${varianceClass(delta)}`}>
              {isCurrent ? "current" : formatSignedKr(delta)}
            </span>
          </span>
        </label>
      );
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change material</DialogTitle>
          <p className={`${MUTED_TEXT} text-left`}>
            {line.label} · {formatQty(line.requiredQuantity ?? 0, unit)} incl. waste
          </p>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Apply to
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={effectiveScope === "room" ? SCOPE_ON_CLASS : SCOPE_OFF_CLASS}>
              <input
                type="radio"
                name="scope"
                className="h-[18px] w-[18px]"
                checked={effectiveScope === "room"}
                onChange={() => setScope("room")}
              />
              <span className="flex flex-col">
                <span className="font-semibold">This room</span>
                <span className={MUTED_TEXT}>This line only</span>
              </span>
            </label>
            <label
              className={`${effectiveScope === "all" ? SCOPE_ON_CLASS : SCOPE_OFF_CLASS} ${canReplaceAll ? "" : "opacity-50"}`}
            >
              <input
                type="radio"
                name="scope"
                className="h-[18px] w-[18px]"
                checked={effectiveScope === "all"}
                disabled={!canReplaceAll}
                onChange={() => setScope("all")}
              />
              <span className="flex flex-col">
                <span className="font-semibold">All rooms</span>
                <span className={MUTED_TEXT}>Using {currentName}</span>
              </span>
            </label>
          </div>
          {effectiveScope === "all" && (
            <p className={MUTED_TEXT}>
              Changes every line using {currentName}. Lines already bought keep their material.
            </p>
          )}
        </fieldset>

        {!creating && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Material
              </span>
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={showAllUnits}
                  onChange={(e) => setShowAllUnits(e.target.checked)}
                />
                Show all units
              </label>
            </div>
            <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              {renderOptions()}
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full border-dashed"
              onClick={() => setCreating(true)}
            >
              Found something specific? Create material
            </Button>
          </>
        )}

        {creating && (
          <CreateMaterialForm
            defaultCategory={currentMaterial?.category ?? ""}
            defaultUnit={unit}
            isPending={createMaterial.isPending || replaceMaterial.isPending || updateLine.isPending}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        )}

        {error && (
          <p role="alert" className={FIELD_ERROR_CLASS}>
            {error}
          </p>
        )}

        <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              {effectiveScope === "all" ? `All lines using ${currentName}` : "This line"}
            </span>
            <span>
              <span className={MUTED_TEXT}>{formatKr(currentCost)} → </span>
              <span className="font-semibold">{formatKr(newCost)}</span>
            </span>
          </div>
          {result ? (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300">{result}</p>
              <Button className="min-h-[44px] w-full" onClick={onClose}>
                Done
              </Button>
            </>
          ) : (
            !creating && (
              <Button
                className="min-h-[44px] w-full"
                onClick={handleApply}
                disabled={!selected || updateLine.isPending || replaceMaterial.isPending}
              >
                {selected ? `Use ${selected.name}` : "Choose a material"}
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

