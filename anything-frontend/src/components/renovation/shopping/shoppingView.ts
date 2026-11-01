import type { RenovationMaterialResponse } from "@/lib/api-client/models/index";
import {
  round2,
  splitByEstimateShare,
  type GroupedToBuy,
  type ToBuyGroup,
} from "@/lib/renovation";
import { parseDecimal } from "@/components/renovation/materials/materialsView";

export function allGroups(grouped: GroupedToBuy): ToBuyGroup[] {
  return [...grouped.materials, ...grouped.services];
}

/** Keys of the group that holds the given line, used to preselect `?line=`. */
export function findGroupKeyForLine(grouped: GroupedToBuy, lineId: number): string | null {
  return allGroups(grouped).find((group) => group.lines.some((line) => line.lineId === lineId))?.key ?? null;
}

export function initialSelection(grouped: GroupedToBuy, lineId: number | null): Set<string> {
  const key = lineId === null ? null : findGroupKeyForLine(grouped, lineId);
  return new Set(key ? [key] : []);
}

export function toggleKey(selected: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function selectedGroups(grouped: GroupedToBuy, selected: ReadonlySet<string>): ToBuyGroup[] {
  return allGroups(grouped).filter((group) => selected.has(group.key));
}

export interface SelectionSummary {
  groupCount: number;
  lineCount: number;
  roomCount: number;
  estimate: number;
}

export function summarizeSelection(groups: readonly ToBuyGroup[]): SelectionSummary {
  const lines = groups.flatMap((group) => group.lines);
  return {
    groupCount: groups.length,
    lineCount: lines.length,
    roomCount: new Set(lines.map((line) => line.roomId)).size,
    estimate: round2(groups.reduce((sum, group) => sum + group.totalEstimate, 0)),
  };
}

export function packHint(
  group: ToBuyGroup,
  materialsById: ReadonlyMap<number, RenovationMaterialResponse>,
): string | null {
  const packSize = group.materialId === null ? undefined : materialsById.get(group.materialId)?.packSize;
  if (!packSize || packSize <= 0) return null;
  // toPrecision keeps 4.26 / 2.13 from becoming 2.0000000000000004 and rounding up to 3.
  const packs = Math.ceil(Number((group.totalQuantity / packSize).toPrecision(12)));
  return `Packs of ${packSize} ${group.unit} → ${packs} ${packs === 1 ? "pack" : "packs"}`;
}

/** Splits a receipt total across lines in proportion to quantity × unit price. */
export function previewSplit(
  total: number,
  rows: readonly { quantity: number; unitPrice: number }[],
): { estimate: number; amounts: number[] } {
  const weights = rows.map((row) =>
    Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity * row.unitPrice : 0,
  );
  const estimate = round2(weights.reduce((sum, weight) => sum + weight, 0));
  return { estimate, amounts: splitByEstimateShare(total, weights) };
}

export function parseQuantity(text: string): number {
  return parseDecimal(text);
}

export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

interface DateOnlyLike {
  year: number;
  month: number;
  day: number;
}

export function formatDateOnly(value: DateOnlyLike | null | undefined): string {
  if (!value) return "No date";
  return new Date(value.year, value.month - 1, value.day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The HTTP status carried by a rejected Kiota call, when there is one. */
export function statusOf(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("responseStatusCode" in err)) return undefined;
  return typeof err.responseStatusCode === "number" ? err.responseStatusCode : undefined;
}

/** The `?line=` deep link from a room's budget line; anything that isn't a positive id is ignored. */
export function parseLineParam(raw: string | null): number | null {
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
