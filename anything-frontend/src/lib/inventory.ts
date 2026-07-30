import type {
  InventoryBoxResponse,
  InventoryItemSummaryResponse,
  InventoryStorageUnitResponse,
} from "@/lib/api-client/models/index";

export const INVENTORY_PATH = "/inventory";

/** Mirrors `Anything.Core.Constants.InventoryAttachmentKinds` on the backend. */
export const InventoryAttachmentKinds = {
  Photo: "Photo",
  Manual: "Manual",
  Receipt: "Receipt",
  Warranty: "Warranty",
  Other: "Other",
} as const;

export type InventoryAttachmentKind =
  (typeof InventoryAttachmentKinds)[keyof typeof InventoryAttachmentKinds];

export const placePath = (id: number) => `${INVENTORY_PATH}/places/${id}`;
export const boxPath = (id: number) => `${INVENTORY_PATH}/boxes/${id}`;
export const itemPath = (id: number) => `${INVENTORY_PATH}/items/${id}`;

/** A box has no name of its own — it is identified by the number written on it. */
export function formatBoxName(box: Pick<InventoryBoxResponse, "number">): string {
  return `Box ${box.number ?? "?"}`;
}

export function formatPlaceName(unit: Pick<InventoryStorageUnitResponse, "name">): string {
  return unit.name ?? "Unnamed place";
}

/** "Basement storage room (Room)" — keeps the place's type visible wherever a place is picked or listed. */
export function formatPlaceLabel(
  unit: Pick<InventoryStorageUnitResponse, "name" | "type">
): string {
  const name = formatPlaceName(unit);
  return unit.type ? `${name} (${unit.type})` : name;
}

export function boxesInPlace(boxes: InventoryBoxResponse[], placeId: number): InventoryBoxResponse[] {
  return boxes.filter((box) => box.storageUnitId === placeId);
}

export function itemsInBox(items: InventoryItemSummaryResponse[], boxId: number): InventoryItemSummaryResponse[] {
  return items.filter((item) => item.boxId === boxId);
}

/** Every item in a place, whether or not it sits in one of the place's boxes. */
export function itemsInPlace(items: InventoryItemSummaryResponse[], placeId: number): InventoryItemSummaryResponse[] {
  return items.filter((item) => item.storageUnitId === placeId);
}

/** Items in a place that are not inside any of its boxes — loose on a shelf. */
export function looseItemsInPlace(items: InventoryItemSummaryResponse[], placeId: number): InventoryItemSummaryResponse[] {
  return itemsInPlace(items, placeId).filter((item) => !item.boxId);
}

/** Items with no place at all, so they'd otherwise be invisible on the overview. */
export function unplacedItems(items: InventoryItemSummaryResponse[]): InventoryItemSummaryResponse[] {
  return items.filter((item) => !item.storageUnitId && !item.boxId);
}

export interface Placement {
  boxId: number | null;
  storageUnitId: number | null;
}

/**
 * `InventoryItem` stores `boxId` and `storageUnitId` independently, so nothing
 * stops the two disagreeing (item in box 3, which lives in the summerhouse,
 * while its own `storageUnitId` says the basement). Whenever a box is chosen,
 * the place is taken from that box rather than from the caller.
 */
export function resolvePlacement(
  placement: Placement,
  boxes: InventoryBoxResponse[]
): Placement {
  if (placement.boxId) {
    const box = boxes.find((b) => b.id === placement.boxId);
    return { boxId: placement.boxId, storageUnitId: box?.storageUnitId ?? null };
  }
  return { boxId: null, storageUnitId: placement.storageUnitId ?? null };
}

/** Human-readable "where is it" line for an item, e.g. "Summerhouse · Box 4". */
export function describeItemLocation(
  item: InventoryItemSummaryResponse,
  boxes: InventoryBoxResponse[],
  places: InventoryStorageUnitResponse[]
): string {
  const box = item.boxId ? boxes.find((b) => b.id === item.boxId) : undefined;
  const placeId = box?.storageUnitId ?? item.storageUnitId;
  const place = placeId ? places.find((p) => p.id === placeId) : undefined;

  const parts = [
    place ? formatPlaceName(place) : null,
    box ? formatBoxName(box) : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" · ") : "Not placed yet";
}

/** Suggests the next free box number so the user doesn't have to remember. */
export function nextBoxNumber(boxes: InventoryBoxResponse[]): number {
  const highest = boxes.reduce((max, box) => Math.max(max, box.number ?? 0), 0);
  return highest + 1;
}

export type WarrantyStatus = "expired" | "expiring-soon" | "active";

export interface WarrantyInfo {
  status: WarrantyStatus;
  label: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const EXPIRING_SOON_DAYS = 30;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/** "Expires in 3 months" / "Expires in 5 days" / "Expired" for a warranty badge. */
export function describeWarranty(warrantyExpiresOn: Date, now: Date = new Date()): WarrantyInfo {
  const daysRemaining = Math.ceil((warrantyExpiresOn.getTime() - now.getTime()) / MS_PER_DAY);

  if (daysRemaining < 0) return { status: "expired", label: "Warranty expired" };
  if (daysRemaining === 0) return { status: "expiring-soon", label: "Warranty expires today" };
  if (daysRemaining <= EXPIRING_SOON_DAYS) {
    return { status: "expiring-soon", label: `Warranty expires in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}` };
  }
  if (daysRemaining < DAYS_PER_YEAR) {
    const months = Math.round(daysRemaining / DAYS_PER_MONTH);
    return { status: "active", label: `Warranty expires in ${months} ${months === 1 ? "month" : "months"}` };
  }
  const years = Math.round(daysRemaining / DAYS_PER_YEAR);
  return { status: "active", label: `Warranty expires in ${years} ${years === 1 ? "year" : "years"}` };
}
