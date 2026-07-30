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
  useCreateInventoryItem,
  useInventoryBoxes,
  useInventoryStorageUnits,
  useUpdateInventoryItem,
  type InventoryItemResponse,
} from "@/hooks/useInventory";
import { InventorySelect } from "@/components/inventory/InventorySelect";
import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  OFFLINE_HINT,
} from "@/components/inventory/inventoryFormStyles";
import { formatBoxName, formatPlaceName, resolvePlacement } from "@/lib/inventory";

interface ItemFormDialogProps {
  /** Omit to create a new item; pass an item to edit it. */
  item?: InventoryItemResponse;
  defaultPlaceId?: number | null;
  defaultBoxId?: number | null;
  onClose: () => void;
}

export function ItemFormDialog({
  item,
  defaultPlaceId,
  defaultBoxId,
  onClose,
}: ItemFormDialogProps) {
  const isEdit = item !== undefined;
  const { data: boxes } = useInventoryBoxes();
  const { data: places } = useInventoryStorageUnits();

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [placeId, setPlaceId] = useState<number | null>(
    item?.storageUnitId ?? defaultPlaceId ?? null
  );
  const [boxId, setBoxId] = useState<number | null>(
    item?.boxId ?? defaultBoxId ?? null
  );

  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const isOnline = useOnlineStatus();
  const isPending = createItem.isPending || updateItem.isPending;

  // Only boxes in the chosen place can hold the item; with no place chosen the
  // user can still pick any box, and the place follows from it on submit. The
  // item's current box always stays in the list even when it belongs to another
  // place, so an item whose box and place already disagree doesn't open with a
  // blank Box select — saving repairs the mismatch in the box's favour.
  const selectableBoxes = placeId
    ? (boxes ?? []).filter(
        (box) => box.storageUnitId === placeId || box.id === boxId
      )
    : (boxes ?? []);

  function handlePlaceChange(nextPlaceId: number | null) {
    setPlaceId(nextPlaceId);
    // A box belonging to the old place would contradict the new one.
    const selectedBox = boxes?.find((box) => box.id === boxId);
    if (selectedBox && selectedBox.storageUnitId !== nextPlaceId) {
      setBoxId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const placement = resolvePlacement({ boxId, storageUnitId: placeId }, boxes ?? []);
    const body = {
      name: trimmed,
      description: description.trim() || null,
      ...placement,
    };

    try {
      if (isEdit) {
        await updateItem.mutateAsync({ id: item.id ?? 0, ...body });
      } else {
        await createItem.mutateAsync(body);
      }
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to save item" : "Failed to create item");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="item-name" className={FIELD_LABEL_CLASS}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="item-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Christmas lights"
              autoFocus
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="item-description" className={FIELD_LABEL_CLASS}>
              Description
            </label>
            <textarea
              id="item-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Two strings, warm white, one needs a new fuse"
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <InventorySelect
            id="item-place"
            label="Place"
            emptyLabel="Not placed yet"
            options={(places ?? []).map((place) => ({
              value: place.id ?? 0,
              label: formatPlaceName(place),
            }))}
            value={placeId}
            onChange={handlePlaceChange}
          />
          <InventorySelect
            id="item-box"
            label="Box"
            emptyLabel="Not in a box"
            options={selectableBoxes.map((box) => ({
              value: box.id ?? 0,
              label: formatBoxName(box),
            }))}
            value={boxId}
            onChange={setBoxId}
            hint="Picking a box also moves the item to that box's place."
          />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending || !name.trim() || !isOnline}
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
