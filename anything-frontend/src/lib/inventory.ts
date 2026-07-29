import type {
  InventoryBox,
  InventoryItem,
  InventoryStorageUnit,
} from "@/lib/api-client/models/index";

export const INVENTORY_PATH = "/inventory";

export const placePath = (id: number) => `${INVENTORY_PATH}/places/${id}`;
export const boxPath = (id: number) => `${INVENTORY_PATH}/boxes/${id}`;
export const itemPath = (id: number) => `${INVENTORY_PATH}/items/${id}`;

/** A box has no name of its own — it is identified by the number written on it. */
export function formatBoxName(box: Pick<InventoryBox, "number">): string {
  return `Box ${box.number ?? "?"}`;
}

export function formatPlaceName(unit: Pick<InventoryStorageUnit, "name">): string {
  return unit.name ?? "Unnamed place";
}

export function boxesInPlace(boxes: InventoryBox[], placeId: number): InventoryBox[] {
  return boxes.filter((box) => box.storageUnitId === placeId);
}

export function itemsInBox(items: InventoryItem[], boxId: number): InventoryItem[] {
  return items.filter((item) => item.boxId === boxId);
}

/** Every item in a place, whether or not it sits in one of the place's boxes. */
export function itemsInPlace(items: InventoryItem[], placeId: number): InventoryItem[] {
  return items.filter((item) => item.storageUnitId === placeId);
}

/** Items in a place that are not inside any of its boxes — loose on a shelf. */
export function looseItemsInPlace(items: InventoryItem[], placeId: number): InventoryItem[] {
  return itemsInPlace(items, placeId).filter((item) => !item.boxId);
}

/** Items with no place at all, so they'd otherwise be invisible on the overview. */
export function unplacedItems(items: InventoryItem[]): InventoryItem[] {
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
  boxes: InventoryBox[]
): Placement {
  if (placement.boxId) {
    const box = boxes.find((b) => b.id === placement.boxId);
    return { boxId: placement.boxId, storageUnitId: box?.storageUnitId ?? null };
  }
  return { boxId: null, storageUnitId: placement.storageUnitId ?? null };
}

/** Human-readable "where is it" line for an item, e.g. "Summerhouse · Box 4". */
export function describeItemLocation(
  item: InventoryItem,
  boxes: InventoryBox[],
  places: InventoryStorageUnit[]
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
export function nextBoxNumber(boxes: InventoryBox[]): number {
  const highest = boxes.reduce((max, box) => Math.max(max, box.number ?? 0), 0);
  return highest + 1;
}
