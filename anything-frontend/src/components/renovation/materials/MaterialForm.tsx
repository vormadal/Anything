"use client";

import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import type { RenovationMaterialResponse } from "@/lib/api-client/models/index";
import type { RenovationMaterialInput } from "@/hooks/useRenovation";
import { Button } from "@/components/ui/button";
import { FIELD_INPUT_CLASS, FIELD_LABEL_CLASS } from "@/components/inventory/inventoryFormStyles";
import { isSafeUrl } from "@/lib/utils";
import {
  materialToFormValues,
  toMaterialInput,
  validateMaterialForm,
  type MaterialFormErrors,
  type MaterialFormValues,
} from "./materialsView";

interface FieldConfig {
  key: keyof MaterialFormValues;
  label: string;
  inputMode?: "decimal" | "numeric" | "text";
  type?: "text" | "url";
  required?: boolean;
  wide?: boolean;
}

const FIELDS: FieldConfig[] = [
  { key: "name", label: "Name", required: true, wide: true },
  { key: "category", label: "Category", wide: true },
  { key: "unit", label: "Per (unit)" },
  { key: "defaultPrice", label: "Default price (kr)", inputMode: "decimal" },
  { key: "wastePercent", label: "Waste %", inputMode: "decimal" },
  { key: "packSize", label: "Pack size", inputMode: "decimal" },
  { key: "productUrl", label: "Product link", type: "url", wide: true },
];

interface MaterialFormProps {
  /** Omit to create a new material. */
  material?: RenovationMaterialResponse;
  categories: string[];
  isPending: boolean;
  onSave: (input: RenovationMaterialInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function MaterialForm({
  material,
  categories,
  isPending,
  onSave,
  onCancel,
  onDelete,
}: MaterialFormProps) {
  const idPrefix = useId();
  const categoryListId = `${idPrefix}-categories`;
  const [values, setValues] = useState<MaterialFormValues>(() => materialToFormValues(material));
  const [errors, setErrors] = useState<MaterialFormErrors>({});

  const handleChange = (key: keyof MaterialFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValues((previous) => ({ ...previous, [key]: next }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateMaterialForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(toMaterialInput(values));
  };

  const linkHref = values.productUrl.trim();
  const showLink = isSafeUrl(linkHref);

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={material ? "Edit material" : "New material"}
      className="flex flex-col gap-3 bg-white px-4 pb-4 pt-1 dark:bg-gray-800"
    >
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((field) => {
          const inputId = `${idPrefix}-${field.key}`;
          const errorId = `${inputId}-error`;
          const error = errors[field.key];
          return (
            <div key={field.key} className={field.wide ? "col-span-2 flex flex-col" : "flex flex-col"}>
              <label htmlFor={inputId} className={FIELD_LABEL_CLASS}>
                {field.label}
              </label>
              <input
                id={inputId}
                type={field.type ?? "text"}
                inputMode={field.inputMode}
                required={field.required}
                list={field.key === "category" ? categoryListId : undefined}
                value={values[field.key]}
                onChange={handleChange(field.key)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={`${FIELD_INPUT_CLASS} h-11`}
              />
              {error && (
                <p id={errorId} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <datalist id={categoryListId}>
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {showLink && (
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          Open product page
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending} className="h-11">
          {material ? "Save" : "Add material"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-11">
          Cancel
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="ml-auto h-11 text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
