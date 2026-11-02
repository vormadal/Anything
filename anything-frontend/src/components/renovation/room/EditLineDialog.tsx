"use client";

import { useState } from "react";
import type { RenovationLineResponse } from "@/lib/api-client/models/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateRenovationLine } from "@/hooks/useRenovation";
import {
  FIELD_ERROR_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  GENERIC_ERROR_MESSAGE,
  lineToSaveInput,
  parseOptionalNumber,
} from "./roomDisplay";

interface EditLineDialogProps {
  projectId: number;
  line: RenovationLineResponse;
  onClose: () => void;
}

/**
 * Edits a line's label, price, waste, fixed quantity and done flag. Only those fields are
 * editable here, but the save sends the whole line: the endpoint replaces every column.
 */
export function EditLineDialog({ projectId, line, onClose }: EditLineDialogProps) {
  const [label, setLabel] = useState(line.label ?? "");
  const [unitPrice, setUnitPrice] = useState(String(line.unitPrice ?? ""));
  const [wastePercent, setWastePercent] = useState(String(line.wastePercent ?? ""));
  const [fixedQuantity, setFixedQuantity] = useState(String(line.fixedQuantity ?? ""));
  const [isComplete, setIsComplete] = useState(line.isComplete ?? false);
  const [error, setError] = useState<string | null>(null);
  const updateLine = useUpdateRenovationLine(projectId);
  const isFixed = line.basis === "Fixed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setError(null);
    try {
      await updateLine.mutateAsync({
        ...lineToSaveInput(line),
        label: label.trim(),
        unitPrice: parseOptionalNumber(unitPrice),
        wastePercent: parseOptionalNumber(wastePercent),
        fixedQuantity: isFixed ? parseOptionalNumber(fixedQuantity) : (line.fixedQuantity ?? undefined),
        isComplete,
      });
      onClose();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit line</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-line-label" className={FIELD_LABEL_CLASS}>Label</label>
            <input
              id="edit-line-label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-line-price" className={FIELD_LABEL_CLASS}>Unit price (kr)</label>
              <input
                id="edit-line-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={FIELD_INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="edit-line-waste" className={FIELD_LABEL_CLASS}>Waste %</label>
              <input
                id="edit-line-waste"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={wastePercent}
                onChange={(e) => setWastePercent(e.target.value)}
                className={FIELD_INPUT_CLASS}
              />
            </div>
          </div>
          {isFixed && (
            <div>
              <label htmlFor="edit-line-fixed" className={FIELD_LABEL_CLASS}>Fixed quantity</label>
              <input
                id="edit-line-fixed"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                required
                value={fixedQuantity}
                onChange={(e) => setFixedQuantity(e.target.value)}
                className={FIELD_INPUT_CLASS}
              />
            </div>
          )}
          <label className="flex min-h-[44px] items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={isComplete}
              onChange={(e) => setIsComplete(e.target.checked)}
              className="h-5 w-5"
            />
            Mark as done
          </label>
          {error && (
            <p role="alert" className={FIELD_ERROR_CLASS}>
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-[44px]" disabled={updateLine.isPending}>
              Save line
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
