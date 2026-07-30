"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  useUpdateInventoryItemFields,
  type InventoryItemFieldResponse,
} from "@/hooks/useInventory";
import { FIELD_INPUT_CLASS, OFFLINE_HINT } from "@/components/inventory/inventoryFormStyles";

const LABEL_MAX_LENGTH = 100;
const VALUE_MAX_LENGTH = 500;

interface FieldRow {
  label: string;
  value: string;
}

interface CustomFieldsEditorProps {
  itemId: number;
  fields: InventoryItemFieldResponse[];
}

function toRows(fields: InventoryItemFieldResponse[]): FieldRow[] {
  return fields.map((field) => ({ label: field.label ?? "", value: field.value ?? "" }));
}

/**
 * Free-form label/value pairs for an item, replaced wholesale on save (matching
 * `PUT /api/inventory-items/{id}/fields`) rather than per-row CRUD.
 */
export function CustomFieldsEditor({ itemId, fields }: CustomFieldsEditorProps) {
  const [rows, setRows] = useState<FieldRow[]>(() => toRows(fields));
  const updateFields = useUpdateInventoryItemFields(itemId);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    setRows(toRows(fields));
  }, [fields]);

  function updateRow(index: number, patch: Partial<FieldRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { label: "", value: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const trimmed = rows
      .map((row) => ({ label: row.label.trim(), value: row.value.trim() }))
      .filter((row) => row.label && row.value);

    try {
      await updateFields.mutateAsync(trimmed);
    } catch {
      toast.error("Failed to save custom fields");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Custom fields</h2>
        <Button variant="ghost" size="sm" className="text-xs" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add field
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No custom fields yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2 items-start">
              <input
                type="text"
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
                placeholder="Label"
                maxLength={LABEL_MAX_LENGTH}
                aria-label="Field label"
                className={`${FIELD_INPUT_CLASS} flex-1`}
              />
              <input
                type="text"
                value={row.value}
                onChange={(e) => updateRow(index, { value: e.target.value })}
                placeholder="Value"
                maxLength={VALUE_MAX_LENGTH}
                aria-label="Field value"
                className={`${FIELD_INPUT_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label="Remove field"
                className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleSave()}
        disabled={updateFields.isPending || !isOnline}
        title={isOnline ? undefined : OFFLINE_HINT}
      >
        {updateFields.isPending ? "Saving..." : "Save fields"}
      </Button>
    </div>
  );
}
