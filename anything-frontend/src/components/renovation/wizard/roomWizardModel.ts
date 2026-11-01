import type {
  RenovationRoomTemplateResponse,
  RenovationTemplateLineResponse,
} from "@/lib/api-client/models/index";
import {
  RENOVATION_GROUPS,
  measureRoom,
  type RoomDimensions,
  type RoomMeasurements,
} from "@/lib/renovation";

/** Fallback dimensions for a template that carries none (metres). */
const FALLBACK_LENGTH_M = 3;
const FALLBACK_WIDTH_M = 3;
const FALLBACK_HEIGHT_M = 2.5;

/** The wizard keeps dimensions as typed text so a half-typed value survives re-renders. */
export interface DimensionFields {
  length: string;
  width: string;
  height: string;
  doors: number;
  windows: number;
}

export type DimensionKey = "length" | "width" | "height";
export type CountKey = "doors" | "windows";
export type WizardStep = 1 | 2 | 3;

export const DIMENSION_FIELDS: readonly { key: DimensionKey; label: string }[] = [
  { key: "length", label: "Length (m)" },
  { key: "width", label: "Width (m)" },
  { key: "height", label: "Height (m)" },
];

export const DIMENSION_ERROR = "Enter a number above 0";

/** Template id: the room type when it has one, otherwise its label. */
export function templateId(template: RenovationRoomTemplateResponse): string {
  return template.roomType || template.label || "";
}

export function templateDimensionFields(template: RenovationRoomTemplateResponse): DimensionFields {
  return {
    length: String(template.length ?? FALLBACK_LENGTH_M),
    width: String(template.width ?? FALLBACK_WIDTH_M),
    height: String(template.height ?? FALLBACK_HEIGHT_M),
    doors: template.doors ?? 0,
    windows: template.windows ?? 0,
  };
}

/** Line keys the template enables out of the box; the scope step starts from these. */
export function defaultLineKeys(template: RenovationRoomTemplateResponse): string[] {
  return (template.lines ?? [])
    .filter((line) => line.enabledByDefault)
    .map((line) => line.key ?? "")
    .filter((key) => key !== "");
}

export function allLineKeys(template: RenovationRoomTemplateResponse): string[] {
  return (template.lines ?? []).map((line) => line.key ?? "").filter((key) => key !== "");
}

/** "typ. 13 m²" from the template's default footprint, the only size hint the type step shows. */
export function typicalSizeHint(template: RenovationRoomTemplateResponse): string {
  if (!template.length || !template.width) return "Size set by you";
  return `typ. ${Math.round(template.length * template.width)} m²`;
}

/** Non-NaN text-to-number parse; blank or junk input becomes NaN. */
export function parseDimension(value: string): number {
  if (value.trim() === "") return Number.NaN;
  return Number(value);
}

export function dimensionsValid(fields: DimensionFields): boolean {
  return DIMENSION_FIELDS.every(({ key }) => parseDimension(fields[key]) > 0);
}

export function dimensionError(value: string): string | undefined {
  return parseDimension(value) > 0 ? undefined : DIMENSION_ERROR;
}

const positiveOrZero = (value: string): number => {
  const parsed = parseDimension(value);
  return parsed > 0 ? parsed : 0;
};

/** Numeric dimensions for pricing; an invalid field counts as 0 so the preview stays finite. */
export function toRoomDimensions(fields: DimensionFields): RoomDimensions {
  return {
    length: positiveOrZero(fields.length),
    width: positiveOrZero(fields.width),
    height: positiveOrZero(fields.height),
    doors: fields.doors,
    windows: fields.windows,
  };
}

export function measurementsFor(fields: DimensionFields): RoomMeasurements {
  const dims = toRoomDimensions(fields);
  return measureRoom(dims.length, dims.width, dims.height, dims.doors, dims.windows);
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export function openingsText(doors: number, windows: number): string {
  if (!doors && !windows) return "no openings";
  return `minus ${plural(doors, "door")}, ${plural(windows, "window")}`;
}

/**
 * Size of the proportional floor-plan rectangle in px, fitted into a 220×130 box
 * and never smaller than 24px so it stays visible while the user types.
 */
export function floorPlanSize(length: number, width: number): { width: number; height: number } {
  const scale = Math.min(220 / (length || 1), 130 / (width || 1));
  return { width: Math.max(24, length * scale), height: Math.max(24, width * scale) };
}

export interface ScopeGroup {
  name: string;
  lines: RenovationTemplateLineResponse[];
}

/** Template lines grouped in RENOVATION_GROUPS order; any unknown group is appended, never dropped. */
export function scopeGroups(template: RenovationRoomTemplateResponse): ScopeGroup[] {
  const lines = template.lines ?? [];
  const known: readonly string[] = RENOVATION_GROUPS;
  const extra = [...new Set(lines.map((line) => line.group ?? ""))].filter(
    (name) => name !== "" && !known.includes(name),
  );
  return [...known, ...extra]
    .map((name) => ({ name, lines: lines.filter((line) => (line.group ?? "") === name) }))
    .filter((group) => group.lines.length > 0);
}
