"use client";

import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
} from "@/components/inventory/inventoryFormStyles";

export interface InventorySelectOption {
  value: number;
  label: string;
}

interface InventorySelectProps {
  id: string;
  label: string;
  options: InventorySelectOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  /** Label for the "nothing selected" option, e.g. "No box". */
  emptyLabel: string;
  disabled?: boolean;
  hint?: string;
}

/**
 * Plain select for choosing a place, a box, or a place's parent place. These
 * lists are short and fully loaded client-side, so there is nothing for a
 * combobox to search.
 */
export function InventorySelect({
  id,
  label,
  options,
  value,
  onChange,
  emptyLabel,
  disabled,
  hint,
}: InventorySelectProps) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className={`${FIELD_INPUT_CLASS} disabled:opacity-50`}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}
