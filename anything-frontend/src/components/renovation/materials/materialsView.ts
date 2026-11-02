import type { RenovationMaterialResponse } from "@/lib/api-client/models/index";
import type { RenovationMaterialInput } from "@/hooks/useRenovation";
import { isSafeUrl } from "@/lib/utils";

/** Chip that shows every material regardless of category. */
export const ALL_CATEGORIES = "All";
/** Bucket for materials saved without a category. */
export const NO_CATEGORY = "Uncategorised";

export interface MaterialFormValues {
  name: string;
  category: string;
  unit: string;
  defaultPrice: string;
  wastePercent: string;
  packSize: string;
  productUrl: string;
}

export type MaterialFormErrors = Partial<Record<keyof MaterialFormValues, string>>;

const NUMERIC_FIELDS = ["defaultPrice", "wastePercent", "packSize"] as const;

function numberToText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function materialToFormValues(material?: RenovationMaterialResponse): MaterialFormValues {
  return {
    name: material?.name ?? "",
    category: material?.category ?? "",
    unit: material?.unit ?? "",
    defaultPrice: numberToText(material?.defaultPrice),
    wastePercent: numberToText(material?.wastePercent),
    packSize: numberToText(material?.packSize),
    productUrl: material?.productUrl ?? "",
  };
}

/** Accepts a comma as the decimal separator, as Danish keyboards type it. NaN when not a number. */
export function parseDecimal(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

export function validateMaterialForm(values: MaterialFormValues): MaterialFormErrors {
  const errors: MaterialFormErrors = {};
  if (!values.name.trim()) errors.name = "Enter a name";
  for (const field of NUMERIC_FIELDS) {
    const text = values[field].trim();
    if (!text) continue;
    const number = parseDecimal(text);
    if (!Number.isFinite(number) || number < 0) errors[field] = "Enter a number, 0 or more";
  }
  const url = values.productUrl.trim();
  if (url && !isSafeUrl(url)) errors.productUrl = "Start with https:// or http://";
  return errors;
}

function optionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  return trimmed ? parseDecimal(trimmed) : undefined;
}

function optionalText(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed || undefined;
}

export function toMaterialInput(values: MaterialFormValues): RenovationMaterialInput {
  return {
    name: values.name.trim(),
    category: optionalText(values.category),
    unit: optionalText(values.unit),
    defaultPrice: optionalNumber(values.defaultPrice),
    wastePercent: optionalNumber(values.wastePercent),
    packSize: optionalNumber(values.packSize),
    productUrl: optionalText(values.productUrl),
  };
}

export function categoryOf(material: RenovationMaterialResponse): string {
  return material.category?.trim() || NO_CATEGORY;
}

/** Distinct categories, alphabetical, with the uncategorised bucket last. */
export function materialCategories(materials: readonly RenovationMaterialResponse[]): string[] {
  const names = new Set(materials.map(categoryOf));
  const hasUncategorised = names.delete(NO_CATEGORY);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  return hasUncategorised ? [...sorted, NO_CATEGORY] : sorted;
}

export function filterMaterials(
  materials: readonly RenovationMaterialResponse[],
  query: string,
  category: string,
): RenovationMaterialResponse[] {
  const needle = query.trim().toLowerCase();
  return materials.filter((material) => {
    if (category !== ALL_CATEGORIES && categoryOf(material) !== category) return false;
    if (!needle) return true;
    return (
      (material.name ?? "").toLowerCase().includes(needle) ||
      categoryOf(material).toLowerCase().includes(needle)
    );
  });
}

export function isProductLinked(material: RenovationMaterialResponse): boolean {
  return isSafeUrl(material.productUrl ?? "");
}
