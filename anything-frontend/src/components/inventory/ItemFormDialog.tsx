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
import { formatBoxName, formatPlaceLabel, resolvePlacement } from "@/lib/inventory";
import { toDateInputValue } from "@/lib/foodPlanUtils";

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
  const [showDetails, setShowDetails] = useState(
    isEdit &&
      (item?.quantity != null ||
        item?.brand ||
        item?.model ||
        item?.serialNumber ||
        item?.purchasedOn ||
        item?.purchasePrice != null ||
        item?.warrantyExpiresOn ||
        item?.notes)
  );
  const [quantity, setQuantity] = useState(item?.quantity?.toString() ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [model, setModel] = useState(item?.model ?? "");
  const [serialNumber, setSerialNumber] = useState(item?.serialNumber ?? "");
  const [purchasedOn, setPurchasedOn] = useState(
    item?.purchasedOn ? toDateInputValue(item.purchasedOn) : ""
  );
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice?.toString() ?? "");
  const [warrantyExpiresOn, setWarrantyExpiresOn] = useState(
    item?.warrantyExpiresOn ? toDateInputValue(item.warrantyExpiresOn) : ""
  );
  const [notes, setNotes] = useState(item?.notes ?? "");

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
      quantity: quantity.trim() ? Number(quantity) : null,
      brand: brand.trim() || null,
      model: model.trim() || null,
      serialNumber: serialNumber.trim() || null,
      purchasedOn: purchasedOn || null,
      purchasePrice: purchasePrice.trim() ? Number(purchasePrice) : null,
      warrantyExpiresOn: warrantyExpiresOn || null,
      notes: notes.trim() || null,
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
              label: formatPlaceLabel(place, places ?? []),
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

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showDetails ? "Hide details" : "Add more details"}
          </button>

          {showDetails && (
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="item-quantity" className={FIELD_LABEL_CLASS}>
                    Quantity
                  </label>
                  <input
                    id="item-quantity"
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="item-purchase-price" className={FIELD_LABEL_CLASS}>
                    Purchase price
                  </label>
                  <input
                    id="item-purchase-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="item-brand" className={FIELD_LABEL_CLASS}>
                    Brand
                  </label>
                  <input
                    id="item-brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="item-model" className={FIELD_LABEL_CLASS}>
                    Model
                  </label>
                  <input
                    id="item-model"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="item-serial-number" className={FIELD_LABEL_CLASS}>
                  Serial number
                </label>
                <input
                  id="item-serial-number"
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className={FIELD_INPUT_CLASS}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="item-purchased-on" className={FIELD_LABEL_CLASS}>
                    Purchased on
                  </label>
                  <input
                    id="item-purchased-on"
                    type="date"
                    value={purchasedOn}
                    onChange={(e) => setPurchasedOn(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="item-warranty-expires-on" className={FIELD_LABEL_CLASS}>
                    Warranty expires
                  </label>
                  <input
                    id="item-warranty-expires-on"
                    type="date"
                    value={warrantyExpiresOn}
                    onChange={(e) => setWarrantyExpiresOn(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="item-notes" className={FIELD_LABEL_CLASS}>
                  Notes
                </label>
                <textarea
                  id="item-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={FIELD_INPUT_CLASS}
                />
              </div>
            </div>
          )}

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
