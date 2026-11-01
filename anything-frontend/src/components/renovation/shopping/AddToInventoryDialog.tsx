"use client";

import { useId, useState, type FormEvent } from "react";
import type { RenovationPurchaseLineResponse } from "@/lib/api-client/models/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIELD_INPUT_CLASS, FIELD_LABEL_CLASS } from "@/components/inventory/inventoryFormStyles";

export interface InventoryTarget {
  purchaseId: number;
  line: RenovationPurchaseLineResponse;
}

export interface InventoryDetails {
  brand?: string;
  model?: string;
  /** yyyy-MM-dd */
  warrantyExpiresOn?: string;
}

interface AddToInventoryDialogProps {
  target: InventoryTarget | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (details: InventoryDetails) => void;
}

function optionalText(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed || undefined;
}

export function AddToInventoryDialog({ target, isPending, onClose, onSubmit }: AddToInventoryDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Mounted only while a target is set, so the fields reset on every open. */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to inventory</DialogTitle>
        </DialogHeader>
        {target && (
          <AddToInventoryForm
            label={target.line.lineLabel ?? "this line"}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddToInventoryForm({
  label,
  isPending,
  onCancel,
  onSubmit,
}: {
  label: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (details: InventoryDetails) => void;
}) {
  const idPrefix = useId();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [warranty, setWarranty] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      brand: optionalText(brand),
      model: optionalText(model),
      warrantyExpiresOn: optionalText(warranty),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Adds {label} to your inventory as one item. You can fill in the details later.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-brand`} className={FIELD_LABEL_CLASS}>
          Brand
        </label>
        <input
          id={`${idPrefix}-brand`}
          type="text"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          className={`${FIELD_INPUT_CLASS} h-11`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-model`} className={FIELD_LABEL_CLASS}>
          Model
        </label>
        <input
          id={`${idPrefix}-model`}
          type="text"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className={`${FIELD_INPUT_CLASS} h-11`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-warranty`} className={FIELD_LABEL_CLASS}>
          Warranty expires (optional)
        </label>
        <input
          id={`${idPrefix}-warranty`}
          type="date"
          value={warranty}
          onChange={(event) => setWarranty(event.target.value)}
          className={`${FIELD_INPUT_CLASS} h-11`}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="h-11">
          Add to inventory
        </Button>
      </div>
    </form>
  );
}
