import type { RenovationLineResponse, RenovationMaterialResponse } from "@/lib/api-client/models/index";
import type { RenovationLineInput } from "@/hooks/useRenovation";
import {
  RENOVATION_BASES,
  RENOVATION_GROUPS,
  formatQty,
  lineEstimate,
  round2,
  type RenovationBasis,
} from "@/lib/renovation";

export type LineDialogKind = "line" | "material" | "editLine";

/** The one dialog open on the room page at a time: line-scoped kinds carry the line id. */
export type RoomDialogState =
  | { kind: LineDialogKind; lineId: number }
  | { kind: "addLine" | "editRoom" | "deleteRoom" };

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";
export const LINE_HAS_PURCHASES_MESSAGE = "This line has purchases — delete those first";
export const ROOM_HAS_PURCHASES_MESSAGE = "This room has purchases — delete those first";

export const BASIS_LABELS: Record<RenovationBasis, string> = {
  Floor: "Floor area",
  Ceiling: "Ceiling area",
  Wall: "Wall area (net of openings)",
  Perimeter: "Perimeter (net of doors)",
  FloorAndWall: "Floor and walls",
  Doors: "Per door",
  Fixed: "Fixed quantity",
};

export const BASIS_OPTIONS = RENOVATION_BASES.map((basis) => ({ value: basis, label: BASIS_LABELS[basis] }));

export const GROUP_OPTIONS = RENOVATION_GROUPS.map((group) => ({ value: group, label: group }));

const OVER_CLASS = "text-orange-700 dark:text-orange-400";
const UNDER_CLASS = "text-blue-700 dark:text-blue-400";
const EVEN_CLASS = "text-gray-500 dark:text-gray-400";

const WHOLE_NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Field classes shared by every room dialog; a single literal keeps Sonar quiet about duplicates. */
export const FIELD_INPUT_CLASS =
  "w-full min-h-[44px] px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export const FIELD_LABEL_CLASS = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export const FIELD_ERROR_CLASS = "text-sm text-red-600 dark:text-red-400";

export function isPurchased(line: RenovationLineResponse): boolean {
  return line.status === "Partial" || line.status === "Complete";
}

/** The amount a row shows on the right: what was paid once bought, the estimate until then. */
export function lineAmount(line: RenovationLineResponse): number {
  return isPurchased(line) ? (line.actual ?? 0) : (line.estimate ?? 0);
}

/** Actual minus estimate, or null while nothing has been bought. */
export function lineVariance(line: RenovationLineResponse): number | null {
  if (!isPurchased(line)) return null;
  return round2((line.actual ?? 0) - (line.estimate ?? 0));
}

export function varianceClass(variance: number): string {
  if (variance > 0) return OVER_CLASS;
  if (variance < 0) return UNDER_CLASS;
  return EVEN_CLASS;
}

/** "+2,950", "−376" or "±0", without a currency suffix (the row already reads as kr). */
export function formatSignedAmount(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "±";
  return `${sign}${WHOLE_NUMBER.format(Math.abs(amount))}`;
}

export function lineStatusLabel(line: RenovationLineResponse): string {
  const unit = line.unit ?? "";
  switch (line.status) {
    case "Complete":
      return "Bought";
    case "Partial":
      return `Partial · ${formatQty(line.purchasedQuantity ?? 0, unit)} of ${formatQty(line.requiredQuantity ?? 0, unit)}`;
    default:
      return "Estimate";
  }
}

export interface LineGroup {
  name: string;
  lines: RenovationLineResponse[];
  boughtCount: number;
}

/** Lines bucketed by group in display order; groups the list doesn't know about trail at the end. */
export function groupLines(lines: readonly RenovationLineResponse[]): LineGroup[] {
  const names: string[] = [...RENOVATION_GROUPS];
  for (const line of lines) {
    const group = line.group ?? "";
    if (!names.includes(group)) names.push(group);
  }
  return names
    .map((name) => {
      const inGroup = lines
        .filter((line) => (line.group ?? "") === name)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return {
        name,
        lines: inGroup,
        boughtCount: inGroup.filter((line) => line.status === "Complete").length,
      };
    })
    .filter((group) => group.lines.length > 0);
}

export function responseStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("responseStatusCode" in err)) return undefined;
  const code = (err as { responseStatusCode?: unknown }).responseStatusCode;
  return typeof code === "number" ? code : undefined;
}

export function isConflict(err: unknown): boolean {
  return responseStatus(err) === 409;
}

/** Every field of a line, as the save endpoint replaces the whole row. */
export function lineToSaveInput(line: RenovationLineResponse): RenovationLineInput & { lineId: number } {
  return {
    lineId: line.id ?? 0,
    label: line.label ?? "",
    group: line.group ?? "",
    basis: line.basis ?? "",
    description: line.description ?? undefined,
    materialId: line.materialId ?? undefined,
    unit: line.unit ?? undefined,
    unitPrice: line.unitPrice ?? undefined,
    wastePercent: line.wastePercent ?? undefined,
    fixedQuantity: line.fixedQuantity ?? undefined,
    isComplete: line.isComplete ?? undefined,
  };
}

/** The line after taking on a material: its name, unit, price and waste are copied; the rest is kept. */
export function lineWithMaterial(
  line: RenovationLineResponse,
  material: RenovationMaterialResponse,
): RenovationLineInput & { lineId: number } {
  return {
    ...lineToSaveInput(line),
    materialId: material.id ?? undefined,
    description: material.name ?? undefined,
    unit: material.unit ?? undefined,
    unitPrice: material.defaultPrice ?? undefined,
    wastePercent: material.wastePercent ?? undefined,
  };
}

/**
 * The line's required quantity if it were priced with another waste percentage. The server
 * stores requiredQuantity already including the line's own waste, so the base is backed out first.
 */
export function requiredQuantityWithWaste(
  line: RenovationLineResponse,
  wastePercent: number | null | undefined,
): number {
  const currentWaste = line.wastePercent ?? 0;
  const required = line.requiredQuantity ?? 0;
  const nextWaste = wastePercent ?? 0;
  if (nextWaste === currentWaste) return required;
  const base = required / (1 + currentWaste / 100);
  return round2(base * (1 + nextWaste / 100));
}

export function costForMaterial(line: RenovationLineResponse, material: RenovationMaterialResponse): number {
  return lineEstimate(requiredQuantityWithWaste(line, material.wastePercent), material.defaultPrice);
}

/** Parses an optional numeric field: blank means "not set" (sent as null), not zero. */
export function parseOptionalNumber(text: string): number | undefined {
  return text.trim() === "" ? undefined : Number(text);
}
