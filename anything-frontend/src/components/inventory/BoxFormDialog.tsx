"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  useCreateInventoryBox,
  useInventoryBoxes,
  useInventoryStorageUnits,
  useUpdateInventoryBox,
  type InventoryBoxResponse,
} from "@/hooks/useInventory";
import { InventorySelect } from "@/components/inventory/InventorySelect";
import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  OFFLINE_HINT,
} from "@/components/inventory/inventoryFormStyles";
import { formatPlaceLabel, nextBoxNumber } from "@/lib/inventory";

interface BoxFormDialogProps {
  /** Omit to create a new box; pass a box to edit it. */
  box?: InventoryBoxResponse;
  /** Pre-selects the place when creating from a place page. */
  defaultPlaceId?: number | null;
  onClose: () => void;
}

export function BoxFormDialog({ box, defaultPlaceId, onClose }: BoxFormDialogProps) {
  const isEdit = box !== undefined;
  const { data: boxes } = useInventoryBoxes();
  const { data: places } = useInventoryStorageUnits();

  const [number, setNumber] = useState(
    String(box?.number ?? nextBoxNumber(boxes ?? []))
  );
  const [placeId, setPlaceId] = useState<number | null>(
    box?.storageUnitId ?? defaultPlaceId ?? null
  );
  const [label, setLabel] = useState(box?.label ?? "");
  const [description, setDescription] = useState(box?.description ?? "");

  const createBox = useCreateInventoryBox();
  const updateBox = useUpdateInventoryBox();
  const isOnline = useOnlineStatus();
  const isPending = createBox.isPending || updateBox.isPending;

  const parsedNumber = Number(number);
  const isValidNumber = Number.isInteger(parsedNumber) && parsedNumber >= 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidNumber) return;

    const body = {
      number: parsedNumber,
      storageUnitId: placeId,
      label: label.trim() || null,
      description: description.trim() || null,
    };
    try {
      if (isEdit) {
        await updateBox.mutateAsync({ id: box.id ?? 0, ...body });
      } else {
        await createBox.mutateAsync(body);
      }
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to save box" : "Failed to create box");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit box" : "New box"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="box-number" className={FIELD_LABEL_CLASS}>
              Number <span className="text-red-500">*</span>
            </label>
            <input
              id="box-number"
              type="number"
              min={1}
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoFocus
              className={FIELD_INPUT_CLASS}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Write this number on the box so you can find it again.
            </p>
          </div>
          <InventorySelect
            id="box-place"
            label="Place"
            emptyLabel="No place yet"
            options={(places ?? []).map((place) => ({
              value: place.id ?? 0,
              label: formatPlaceLabel(place),
            }))}
            value={placeId}
            onChange={setPlaceId}
          />
          <div>
            <label htmlFor="box-label" className={FIELD_LABEL_CLASS}>
              Label
            </label>
            <input
              id="box-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Christmas decorations"
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="box-description" className={FIELD_LABEL_CLASS}>
              Description
            </label>
            <textarea
              id="box-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending || !isValidNumber || !isOnline}
              title={isOnline ? undefined : OFFLINE_HINT}
            >
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
