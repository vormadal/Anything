import type {
  RenovationMaterialResponse,
  RenovationProjectResponse,
  RenovationRoomTemplateResponse,
} from "@/lib/api-client/models/index";

/**
 * Renovation budget arithmetic for the frontend. Mirrors
 * `src/Anything.Application/Features/Renovation/RenovationCalculator.cs` (and the
 * room templates' seeding in `CreateRenovationRoom.cs`) so a room can be priced
 * before it exists. Change both together.
 */

export const RENOVATION_BASES = [
  "Floor",
  "Ceiling",
  "Wall",
  "Perimeter",
  "FloorAndWall",
  "Doors",
  "Fixed",
] as const;
export type RenovationBasis = (typeof RENOVATION_BASES)[number];

/** Display order of a budget line's group. */
export const RENOVATION_GROUPS = ["Surfaces", "Fixtures", "Labour"] as const;

const LABOUR_GROUP = "Labour";

// Opening sizes subtracted from wall area / perimeter. Must match RenovationCalculator.
const DOOR_AREA = 1.89;
const DOOR_WIDTH = 0.9;
const WINDOW_AREA = 1.5;

const ONE_DECIMAL_UNITS = new Set(["m²", "m2", "m"]);
// Same locale and currency as `formatCurrency` in `@/lib/billFormat`, so a household sees one
// money style across bills and renovation. Budget figures are whole kroner.
const KR_FORMAT = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const ONE_DECIMAL_FORMAT = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const WHOLE_FORMAT = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });
const DECIMAL_FORMAT = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 });

export interface RoomDimensions {
  length: number;
  width: number;
  height: number;
  doors: number;
  windows: number;
}

export interface RoomMeasurements {
  /** m² */
  floorArea: number;
  /** m² of wall, net of doors and windows */
  wallArea: number;
  /** m, net of door widths */
  perimeter: number;
}

export interface TemplateLineEstimate {
  key: string;
  label: string;
  group: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  estimate: number;
}

export interface TemplateRoomEstimate {
  measurements: RoomMeasurements;
  lines: TemplateLineEstimate[];
  total: number;
}

export interface ToBuyLine {
  lineId: number;
  roomId: number;
  roomName: string;
  label: string;
  remainingQuantity: number;
  unitPrice: number;
  remainingEstimate: number;
}

export interface ToBuyGroup {
  key: string;
  description: string;
  unit: string;
  materialId: number | null;
  lines: ToBuyLine[];
  totalQuantity: number;
  totalEstimate: number;
}

export interface GroupedToBuy {
  materials: ToBuyGroup[];
  services: ToBuyGroup[];
}

/**
 * Rounds half away from zero to 2 decimals, like C# `Math.Round(x, 2, AwayFromZero)`.
 * `toPrecision(15)` removes binary noise first, so 1.005 (stored as 1.00499999…) becomes 1.01.
 */
export function round2(value: number): number {
  const hundredths = Math.round(Number((Math.abs(value) * 100).toPrecision(15)));
  const rounded = hundredths / 100;
  return value < 0 && hundredths !== 0 ? -rounded : rounded;
}

export function measureRoom(
  length: number,
  width: number,
  height: number,
  doors: number,
  windows: number,
): RoomMeasurements {
  const perimeterLength = 2 * (length + width);
  return {
    floorArea: round2(length * width),
    wallArea: round2(
      Math.max(0, perimeterLength * height - DOOR_AREA * doors - WINDOW_AREA * windows),
    ),
    perimeter: round2(Math.max(0, perimeterLength - DOOR_WIDTH * doors)),
  };
}

/** The quantity the basis measures, before waste. Unknown bases price as Fixed, like the server. */
export function baseQuantity(
  basis: string | null | undefined,
  fixedQuantity: number | null | undefined,
  measurements: RoomMeasurements,
  doors: number,
): number {
  switch (basis) {
    case "Floor":
    case "Ceiling":
      return measurements.floorArea;
    case "Wall":
      return measurements.wallArea;
    case "Perimeter":
      return measurements.perimeter;
    case "FloorAndWall":
      return measurements.floorArea + measurements.wallArea;
    case "Doors":
      return doors;
    default:
      return fixedQuantity ?? 0;
  }
}

export function requiredQuantity(
  basis: string | null | undefined,
  fixedQuantity: number | null | undefined,
  wastePercent: number | null | undefined,
  measurements: RoomMeasurements,
  doors: number,
): number {
  const base = baseQuantity(basis, fixedQuantity, measurements, doors);
  return round2(base * (1 + (wastePercent ?? 0) / 100));
}

/** Estimate for a quantity at a unit price, rounded to whole øre. */
export function lineEstimate(quantity: number, unitPrice: number | null | undefined): number {
  return round2(quantity * (unitPrice ?? 0));
}

/** Indexes materials by their lower-cased name, the key template lines resolve against. */
export function indexMaterialsByName(
  materials: readonly RenovationMaterialResponse[],
): Map<string, RenovationMaterialResponse> {
  const byName = new Map<string, RenovationMaterialResponse>();
  for (const material of materials) {
    if (material.name) byName.set(material.name.toLowerCase(), material);
  }
  return byName;
}

/**
 * Prices the template lines whose keys are selected, as the server would on room creation.
 * The server always prices a seeded line from the household's material of that name, so when
 * `materialsByName` has it, that material's unit/price/waste win; otherwise the template's own
 * defaults are used.
 */
export function estimateTemplateRoom(
  template: RenovationRoomTemplateResponse,
  dims: RoomDimensions,
  selectedKeys: readonly string[],
  materialsByName?: ReadonlyMap<string, RenovationMaterialResponse>,
): TemplateRoomEstimate {
  const measurements = measureRoom(dims.length, dims.width, dims.height, dims.doors, dims.windows);
  const selected = new Set(selectedKeys);
  const lines = (template.lines ?? [])
    .filter((line) => selected.has(line.key ?? ""))
    .map((line): TemplateLineEstimate => {
      const material = line.materialName
        ? materialsByName?.get(line.materialName.toLowerCase())
        : undefined;
      // Both shapes carry unit, defaultPrice and wastePercent, so the material simply shadows the template.
      const priced = material ?? line;
      const quantity = requiredQuantity(
        line.basis,
        line.fixedQuantity,
        priced.wastePercent,
        measurements,
        dims.doors,
      );
      const unitPrice = priced.defaultPrice ?? 0;
      return {
        key: line.key ?? "",
        label: line.label ?? "",
        group: line.group ?? "",
        description: material?.name ?? line.materialName ?? line.label ?? "",
        quantity,
        unit: priced.unit ?? "",
        unitPrice,
        estimate: lineEstimate(quantity, unitPrice),
      };
    });
  const total = round2(lines.reduce((sum, line) => sum + line.estimate, 0));
  return { measurements, lines, total };
}

/**
 * Splits `total` in proportion to `weights`, mirroring RenovationCalculator.Split: each share is
 * rounded and the last item takes the remainder, so the result sums to `total`. An even split
 * is used when every weight is zero.
 */
export function splitByEstimateShare(total: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  const result: number[] = [];
  let given = 0;
  for (let i = 0; i < weights.length - 1; i++) {
    const share = sum > 0 ? weights[i] / sum : 1 / weights.length;
    const amount = round2(total * share);
    result.push(amount);
    given += amount;
  }
  result.push(round2(total - given));
  return result;
}

/**
 * Aggregates every line still to buy (remainingQuantity > 0) across all rooms, merging lines
 * that point at the same material (or, for free-text lines, the same description). Labour
 * lines are returned as `services`; everything else as `materials`.
 */
export function groupToBuy(project: Pick<RenovationProjectResponse, "rooms">): GroupedToBuy {
  const materials = new Map<string, ToBuyGroup>();
  const services = new Map<string, ToBuyGroup>();

  for (const room of project.rooms ?? []) {
    for (const line of room.lines ?? []) {
      const remaining = line.remainingQuantity ?? 0;
      if (remaining <= 0) continue;

      const unitPrice = line.unitPrice ?? 0;
      const description = line.description || line.label || "";
      const materialId = line.materialId ?? null;
      const key = materialId !== null ? `material:${materialId}` : `description:${description}`;
      const target = line.group === LABOUR_GROUP ? services : materials;

      const toBuyLine: ToBuyLine = {
        lineId: line.id ?? 0,
        roomId: line.roomId ?? room.id ?? 0,
        roomName: room.name ?? "",
        label: line.label ?? "",
        remainingQuantity: remaining,
        unitPrice,
        remainingEstimate: lineEstimate(remaining, unitPrice),
      };

      const group = target.get(key) ?? {
        key,
        description,
        unit: line.unit ?? "",
        materialId,
        lines: [],
        totalQuantity: 0,
        totalEstimate: 0,
      };
      group.lines.push(toBuyLine);
      group.totalQuantity = round2(group.totalQuantity + remaining);
      group.totalEstimate = round2(group.totalEstimate + toBuyLine.remainingEstimate);
      target.set(key, group);
    }
  }

  return { materials: [...materials.values()], services: [...services.values()] };
}

/** Whole kroner in da-DK style, e.g. "102.184 kr." (the locale's own space before "kr." is kept). */
export function formatKr(amount: number): string {
  return KR_FORMAT.format(amount);
}

/** Up to two decimals in da-DK style ("2,13", "9"), for user-entered sizes such as a pack size. */
export function formatDecimal(value: number): string {
  return DECIMAL_FORMAT.format(value);
}

/** One decimal in da-DK style ("3,0"), for metres and percentages as well as quantities. */
export function formatOneDecimal(value: number): string {
  return ONE_DECIMAL_FORMAT.format(value);
}

/** One decimal for m² and m, whole numbers otherwise, with da-DK separators ("13,9 m²"). */
export function formatQty(quantity: number, unit: string | null | undefined): string {
  const formatter = ONE_DECIMAL_UNITS.has(unit ?? "") ? ONE_DECIMAL_FORMAT : WHOLE_FORMAT;
  const formatted = formatter.format(quantity);
  return unit ? `${formatted} ${unit}` : formatted;
}
