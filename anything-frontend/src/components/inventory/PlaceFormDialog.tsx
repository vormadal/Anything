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
  useCreateInventoryStorageUnit,
  useInventoryStorageUnits,
  useUpdateInventoryStorageUnit,
  type InventoryStorageUnitResponse,
} from "@/hooks/useInventory";
import { InventorySelect } from "@/components/inventory/InventorySelect";
import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  OFFLINE_HINT,
} from "@/components/inventory/inventoryFormStyles";
import { eligibleParentPlaces, formatPlaceBreadcrumb } from "@/lib/inventory";

interface PlaceFormDialogProps {
  /** Omit to create a new place; pass a place to edit it. */
  place?: InventoryStorageUnitResponse;
  /** Pre-selects the parent when creating from a place's detail page. */
  defaultParentId?: number | null;
  onClose: () => void;
}

export function PlaceFormDialog({ place, defaultParentId, onClose }: PlaceFormDialogProps) {
  const isEdit = place !== undefined;
  const { data: places } = useInventoryStorageUnits();
  const [name, setName] = useState(place?.name ?? "");
  const [parentId, setParentId] = useState<number | null>(
    place?.parentId ?? defaultParentId ?? null
  );

  const createPlace = useCreateInventoryStorageUnit();
  const updatePlace = useUpdateInventoryStorageUnit();
  const isOnline = useOnlineStatus();
  const isPending = createPlace.isPending || updatePlace.isPending;
  const parentOptions = eligibleParentPlaces(place, places ?? []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const body = { name: trimmed, parentId };
    try {
      if (isEdit) {
        await updatePlace.mutateAsync({ id: place.id ?? 0, ...body });
      } else {
        await createPlace.mutateAsync(body);
      }
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to save place" : "Failed to create place");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit place" : "New place"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="place-name" className={FIELD_LABEL_CLASS}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="place-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Basement storage room"
              autoFocus
              className={FIELD_INPUT_CLASS}
            />
          </div>
          <InventorySelect
            id="place-parent"
            label="Parent place"
            emptyLabel="No parent (top-level place)"
            options={parentOptions.map((option) => ({
              value: option.id ?? 0,
              label: formatPlaceBreadcrumb(option, places ?? []),
            }))}
            value={parentId}
            onChange={setParentId}
            hint="Nest this place inside another, e.g. a shed inside the summerhouse."
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
