"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RenovationMaterialInput } from "@/hooks/useRenovation";
import { FIELD_INPUT_CLASS, FIELD_LABEL_CLASS, parseOptionalNumber } from "./roomDisplay";

interface CreateMaterialFormProps {
  defaultCategory: string;
  defaultUnit: string;
  isPending: boolean;
  onSubmit: (input: RenovationMaterialInput) => void;
  onCancel: () => void;
}

/** New household material, created from inside a room and then applied to the line. */
export function CreateMaterialForm({
  defaultCategory,
  defaultUnit,
  isPending,
  onSubmit,
  onCancel,
}: CreateMaterialFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [unit, setUnit] = useState(defaultUnit);
  const [price, setPrice] = useState("");
  const [waste, setWaste] = useState("");
  const [packSize, setPackSize] = useState("");
  const [productUrl, setProductUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category: category.trim() || undefined,
      unit: unit.trim() || undefined,
      defaultPrice: parseOptionalNumber(price),
      wastePercent: parseOptionalNumber(waste),
      packSize: parseOptionalNumber(packSize),
      productUrl: productUrl.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-900 dark:border-gray-100 p-3.5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New material</h3>
      <div>
        <label htmlFor="new-material-name" className={FIELD_LABEL_CLASS}>Name</label>
        <input
          id="new-material-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FIELD_INPUT_CLASS}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="new-material-category" className={FIELD_LABEL_CLASS}>Category</label>
          <input
            id="new-material-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-material-unit" className={FIELD_LABEL_CLASS}>Unit</label>
          <input
            id="new-material-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-material-price" className={FIELD_LABEL_CLASS}>Price (kr)</label>
          <input
            id="new-material-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-material-waste" className={FIELD_LABEL_CLASS}>Waste %</label>
          <input
            id="new-material-waste"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={waste}
            onChange={(e) => setWaste(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-material-pack" className={FIELD_LABEL_CLASS}>Pack size</label>
          <input
            id="new-material-pack"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label htmlFor="new-material-url" className={FIELD_LABEL_CLASS}>
          Product link <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
        </label>
        <input
          id="new-material-url"
          type="url"
          placeholder="https://"
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          className={FIELD_INPUT_CLASS}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Saved to the materials library, so other rooms and templates can use it too.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={onCancel}>
          Back
        </Button>
        <Button type="submit" className="min-h-[44px]" disabled={isPending}>
          Save material and use it
        </Button>
      </div>
    </form>
  );
}
