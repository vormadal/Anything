"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateRenovationLine } from "@/hooks/useRenovation";
import {
  BASIS_OPTIONS,
  FIELD_ERROR_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  GENERIC_ERROR_MESSAGE,
  GROUP_OPTIONS,
  parseOptionalNumber,
} from "./roomDisplay";

interface AddLineDialogProps {
  projectId: number;
  roomId: number;
  onClose: () => void;
}

/** Adds a budget line to this room. Only the fixed-quantity field depends on the chosen basis. */
export function AddLineDialog({ projectId, roomId, onClose }: AddLineDialogProps) {
  const [label, setLabel] = useState("");
  const [group, setGroup] = useState<string>(GROUP_OPTIONS[0].value);
  const [basis, setBasis] = useState<string>(BASIS_OPTIONS[0].value);
  const [description, setDescription] = useState("");
  const [fixedQuantity, setFixedQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [wastePercent, setWastePercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createLine = useCreateRenovationLine(projectId);
  const isFixed = basis === "Fixed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setError(null);
    try {
      await createLine.mutateAsync({
        roomId,
        label: label.trim(),
        group,
        basis,
        description: description.trim() || undefined,
        fixedQuantity: isFixed ? parseOptionalNumber(fixedQuantity) : undefined,
        unit: unit.trim() || undefined,
        unitPrice: parseOptionalNumber(unitPrice),
        wastePercent: parseOptionalNumber(wastePercent),
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
          <DialogTitle>Add line</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="add-line-label" className={FIELD_LABEL_CLASS}>Label</label>
            <input
              id="add-line-label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Floor"
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-line-group" className={FIELD_LABEL_CLASS}>Group</label>
              <select
                id="add-line-group"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className={FIELD_INPUT_CLASS}
              >
                {GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="add-line-basis" className={FIELD_LABEL_CLASS}>Measured by</label>
              <select
                id="add-line-basis"
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
                className={FIELD_INPUT_CLASS}
              >
                {BASIS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="add-line-description" className={FIELD_LABEL_CLASS}>Description</label>
            <input
              id="add-line-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
          {isFixed && (
            <div>
              <label htmlFor="add-line-fixed" className={FIELD_LABEL_CLASS}>Fixed quantity</label>
              <input
                id="add-line-fixed"
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="add-line-unit" className={FIELD_LABEL_CLASS}>Unit</label>
              <input
                id="add-line-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="m²"
                className={FIELD_INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="add-line-price" className={FIELD_LABEL_CLASS}>Unit price (kr)</label>
              <input
                id="add-line-price"
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
              <label htmlFor="add-line-waste" className={FIELD_LABEL_CLASS}>Waste %</label>
              <input
                id="add-line-waste"
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
          {error && (
            <p role="alert" className={FIELD_ERROR_CLASS}>
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-[44px]" disabled={createLine.isPending}>
              Add line
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
