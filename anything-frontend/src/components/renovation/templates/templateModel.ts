import type {
  RenovationMaterialResponse,
  RenovationRoomTemplateResponse,
  RenovationTemplateLineResponse,
} from "@/lib/api-client/models/index";
import type { RenovationRoomTemplateInput } from "@/hooks/useRenovation";
import {
  RENOVATION_BASES,
  RENOVATION_GROUPS,
  estimateTemplateRoom,
  indexMaterialsByName,
  type RoomDimensions,
  type TemplateRoomEstimate,
} from "@/lib/renovation";

// Limits mirror SaveRenovationRoomTemplateRequest / SaveRenovationTemplateLineRequest on the server.
export const ROOM_TYPE_MAX_LENGTH = 50;
const TEMPLATE_LABEL_MAX = 100;
const LINE_LABEL_MAX = 200;
const MATERIAL_NAME_MAX = 200;
const CATEGORY_MAX = 100;
const UNIT_MAX = 20;
const MAX_ROOM_LENGTH_M = 1000;
const MAX_ROOM_HEIGHT_M = 100;
const MAX_OPENINGS = 100;
const MAX_PRICE = 100_000_000;
const MAX_WASTE_PERCENT = 100;
const MAX_FIXED_QUANTITY = 1_000_000;

const ENTER_NAME = "Enter a name";
const ENTER_MATERIAL = "Enter the material this line buys";
const ENTER_CATEGORY = "Enter a category";
const ENTER_UNIT = "Enter a unit";
const ENTER_QUANTITY = "Enter a quantity";
const DUPLICATE_LINE = "Another line already has this name";
const NEEDS_LETTERS = "Use letters or numbers in the name";
const TYPE_EXISTS = "A room type with this name already exists";

/** Editable state of one template line. Numbers stay as typed text until saved. */
export interface TemplateLineForm {
  /** Client-only identity, so React keeps a row's state when the list is reordered. */
  id: string;
  /** The saved key. Empty for a line added in this session; derived from its label on save. */
  key: string;
  label: string;
  group: string;
  category: string;
  materialName: string;
  basis: string;
  unit: string;
  defaultPrice: string;
  wastePercent: string;
  fixedQuantity: string;
  enabledByDefault: boolean;
}

export interface TemplateForm {
  label: string;
  length: string;
  width: string;
  height: string;
  doors: string;
  windows: string;
  lines: TemplateLineForm[];
}

export interface LineErrors {
  key?: string;
  label?: string;
  category?: string;
  materialName?: string;
  unit?: string;
  defaultPrice?: string;
  wastePercent?: string;
  fixedQuantity?: string;
}

export interface TemplateFormErrors {
  label?: string;
  length?: string;
  width?: string;
  height?: string;
  doors?: string;
  windows?: string;
  lines: Record<string, LineErrors>;
}

const DANISH_LETTERS: Record<string, string> = { "æ": "ae", "ø": "oe", "å": "aa" };

/**
 * Lower-cases, spells out æ/ø/å, strips other accents, turns spaces into hyphens and drops
 * anything outside a-z, 0-9 and '-' ("Bøf-køkken" → "boef-koekken").
 */
export function deriveSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[æøå]/g, (c) => DANISH_LETTERS[c])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, ROOM_TYPE_MAX_LENGTH);
}

/** Validates the name for a new room type; returns the message to show, or undefined. */
export function validateNewRoomType(label: string, existingTypes: readonly string[]): string | undefined {
  if (label.trim() === "") return ENTER_NAME;
  const slug = deriveSlug(label);
  if (slug === "") return NEEDS_LETTERS;
  return existingTypes.includes(slug) ? TYPE_EXISTS : undefined;
}

/** Parses a typed number, accepting a Danish decimal comma. NaN when blank or not a number. */
export function parseNumber(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed.replace(",", "."));
}

function isBlank(text: string): boolean {
  return text.trim() === "";
}

function lineKeyOf(line: TemplateLineForm): string {
  return line.key || deriveSlug(line.label);
}

export function newTemplateLine(id: string): TemplateLineForm {
  return {
    id,
    key: "",
    label: "",
    group: RENOVATION_GROUPS[0],
    category: "",
    materialName: "",
    basis: RENOVATION_BASES[0],
    unit: "",
    defaultPrice: "",
    wastePercent: "",
    fixedQuantity: "",
    enabledByDefault: true,
  };
}

function lineToForm(line: RenovationTemplateLineResponse, id: string): TemplateLineForm {
  return {
    id,
    key: line.key ?? "",
    label: line.label ?? "",
    group: line.group ?? "",
    category: line.category ?? "",
    materialName: line.materialName ?? "",
    basis: line.basis ?? "",
    unit: line.unit ?? "",
    defaultPrice: line.defaultPrice == null ? "" : String(line.defaultPrice),
    wastePercent: line.wastePercent == null ? "" : String(line.wastePercent),
    fixedQuantity: line.fixedQuantity == null ? "" : String(line.fixedQuantity),
    enabledByDefault: line.enabledByDefault ?? false,
  };
}

/** A template as editable form state. Without a template (a new room type) the form starts empty. */
export function templateToForm(template: RenovationRoomTemplateResponse | undefined, label = ""): TemplateForm {
  if (!template) {
    return { label, length: "", width: "", height: "", doors: "", windows: "", lines: [] };
  }
  return {
    label: template.label ?? "",
    length: String(template.length ?? ""),
    width: String(template.width ?? ""),
    height: String(template.height ?? ""),
    doors: String(template.doors ?? ""),
    windows: String(template.windows ?? ""),
    lines: (template.lines ?? []).map((line, index) => lineToForm(line, `saved-${index}`)),
  };
}

function checkRequiredText(value: string, max: number, empty: string): string | undefined {
  if (value.trim() === "") return empty;
  return value.trim().length > max ? `Keep it to ${max} characters` : undefined;
}

function checkNumber(text: string, max: number, whole = false): string | undefined {
  const value = parseNumber(text);
  const range = whole ? `a whole number from 0 to ${max}` : `a number from 0 to ${max}`;
  if (Number.isNaN(value)) return `Enter ${range}`;
  const invalid = value < 0 || value > max || (whole && !Number.isInteger(value));
  return invalid ? `Enter ${range}` : undefined;
}

function checkOptionalNumber(text: string, max: number): string | undefined {
  return isBlank(text) ? undefined : checkNumber(text, max);
}

function checkLine(line: TemplateLineForm, key: string | undefined): LineErrors {
  const errors: LineErrors = {
    label: checkRequiredText(line.label, LINE_LABEL_MAX, ENTER_NAME),
    materialName: checkRequiredText(line.materialName, MATERIAL_NAME_MAX, ENTER_MATERIAL),
    category: checkRequiredText(line.category, CATEGORY_MAX, ENTER_CATEGORY),
    unit: checkRequiredText(line.unit, UNIT_MAX, ENTER_UNIT),
    defaultPrice: checkOptionalNumber(line.defaultPrice, MAX_PRICE),
    wastePercent: checkOptionalNumber(line.wastePercent, MAX_WASTE_PERCENT),
    fixedQuantity:
      line.basis === "Fixed" && isBlank(line.fixedQuantity)
        ? ENTER_QUANTITY
        : checkOptionalNumber(line.fixedQuantity, MAX_FIXED_QUANTITY),
    key,
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as LineErrors;
}

/** Keys are unique across the template: a duplicate is flagged on every line that shares it. */
function duplicateKeyErrors(lines: readonly TemplateLineForm[]): Record<string, string | undefined> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = lineKeyOf(line);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    lines.map((line) => {
      const key = lineKeyOf(line);
      if (line.label.trim() === "") return [line.id, undefined];
      if (key === "") return [line.id, NEEDS_LETTERS];
      return [line.id, (counts.get(key) ?? 0) > 1 ? DUPLICATE_LINE : undefined];
    }),
  );
}

export function validateTemplateForm(form: TemplateForm): TemplateFormErrors {
  const keyErrors = duplicateKeyErrors(form.lines);
  const lines: Record<string, LineErrors> = {};
  for (const line of form.lines) {
    const errors = checkLine(line, keyErrors[line.id]);
    if (Object.keys(errors).length > 0) lines[line.id] = errors;
  }
  return {
    label: checkRequiredText(form.label, TEMPLATE_LABEL_MAX, ENTER_NAME),
    length: checkNumber(form.length, MAX_ROOM_LENGTH_M),
    width: checkNumber(form.width, MAX_ROOM_LENGTH_M),
    height: checkNumber(form.height, MAX_ROOM_HEIGHT_M),
    doors: checkNumber(form.doors, MAX_OPENINGS, true),
    windows: checkNumber(form.windows, MAX_OPENINGS, true),
    lines,
  };
}

export function hasTemplateErrors(errors: TemplateFormErrors): boolean {
  const topLevel = [errors.label, errors.length, errors.width, errors.height, errors.doors, errors.windows];
  return topLevel.some(Boolean) || Object.keys(errors.lines).length > 0;
}

/** The PUT body for a validated form. Callers must check `validateTemplateForm` first. */
export function formToInput(form: TemplateForm): RenovationRoomTemplateInput {
  return {
    label: form.label.trim(),
    length: parseNumber(form.length),
    width: parseNumber(form.width),
    height: parseNumber(form.height),
    doors: parseNumber(form.doors),
    windows: parseNumber(form.windows),
    lines: form.lines.map((line) => ({
      key: lineKeyOf(line),
      label: line.label.trim(),
      group: line.group,
      category: line.category.trim(),
      materialName: line.materialName.trim(),
      basis: line.basis,
      unit: line.unit.trim(),
      defaultPrice: isBlank(line.defaultPrice) ? undefined : parseNumber(line.defaultPrice),
      wastePercent: isBlank(line.wastePercent) ? undefined : parseNumber(line.wastePercent),
      fixedQuantity:
        line.basis === "Fixed" && !isBlank(line.fixedQuantity) ? parseNumber(line.fixedQuantity) : undefined,
      enabledByDefault: line.enabledByDefault,
    })),
  };
}

/** Estimate for the form as it stands, at its default size, counting only lines that are on by default. */
export function estimateForm(
  form: TemplateForm,
  materials: readonly RenovationMaterialResponse[],
): TemplateRoomEstimate | null {
  const dims: RoomDimensions = {
    length: parseNumber(form.length),
    width: parseNumber(form.width),
    height: parseNumber(form.height),
    doors: parseNumber(form.doors),
    windows: parseNumber(form.windows),
  };
  const sizeIsValid = [dims.length, dims.width, dims.height, dims.doors, dims.windows].every(Number.isFinite);
  if (!sizeIsValid) return null;

  const lines = form.lines.map((line) => ({
    key: lineKeyOf(line),
    label: line.label,
    group: line.group,
    category: line.category,
    materialName: line.materialName,
    basis: line.basis,
    unit: line.unit,
    defaultPrice: isBlank(line.defaultPrice) ? null : parseNumber(line.defaultPrice),
    wastePercent: isBlank(line.wastePercent) ? null : parseNumber(line.wastePercent),
    fixedQuantity: isBlank(line.fixedQuantity) ? null : parseNumber(line.fixedQuantity),
    enabledByDefault: line.enabledByDefault,
  }));
  const preview = { label: form.label, lines } as RenovationRoomTemplateResponse;
  const onKeys = lines.filter((line) => line.enabledByDefault).map((line) => line.key);
  return estimateTemplateRoom(preview, dims, onKeys, indexMaterialsByName(materials));
}
