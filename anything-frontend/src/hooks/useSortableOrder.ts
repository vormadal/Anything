"use client";

import { useMemo, useState } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface UseSortableOrderOptions<T> {
  /** The list in its currently persisted order. */
  items: T[] | undefined;
  /**
   * Identity accessor. Declare it at module scope (or memoise it) — it is a
   * dependency of the ordering memo.
   */
  getId: (item: T) => UniqueIdentifier;
  /** Persists the new order. Only called when a drop actually moved something. */
  onReorder: (ordered: T[]) => void;
  /** When true, drops are ignored (e.g. while offline). */
  disabled?: boolean;
}

interface DroppedOrder<T> {
  /** The `items` array the order was derived from; the order applies only to it. */
  source: T[];
  ids: UniqueIdentifier[];
}

/**
 * Shared wiring for a vertical dnd-kit sortable list backed by a React Query list.
 *
 * The reason this exists rather than each page calling `mutate()` from `onDragEnd`:
 * dnd-kit only avoids a visible jump on drop if the new order is committed in the
 * *same* React render as the drag ending. It invokes `onDragEnd` inside the same
 * batched update that clears the active drag, so a `setState` here lands together
 * with it and every row goes straight from "old slot + drag transform" to "new slot,
 * no transform" — the same pixels, so nothing moves.
 *
 * Going through the mutation cache alone cannot do that: React Query's `onMutate`
 * runs a tick later (it awaits `cancelQueries` first), so the drop first clears all
 * transforms against the *old* order — every row snaps back to where the drag
 * started — and the list only re-sorts on the next tick. That reads as rows jumping
 * in from their old positions instead of settling where they were dropped.
 *
 * The dropped order is therefore held locally, but only for as long as `items` keeps
 * the identity it was derived from. The next array the query hands back wins,
 * whether that is the optimistic update (same order — nothing moves), a rollback
 * after a failed reorder, or a refetch. That keeps this from masking server state:
 * it covers the gap before the mutation is applied and nothing beyond it.
 */
export function useSortableOrder<T>({
  items,
  getId,
  onReorder,
  disabled = false,
}: UseSortableOrderOptions<T>) {
  const [dropped, setDropped] = useState<DroppedOrder<T> | null>(null);
  const droppedIds = dropped && dropped.source === items ? dropped.ids : null;

  const orderedItems = useMemo(() => {
    if (!items || !droppedIds || items.length !== droppedIds.length) return items;

    const byId = new Map(items.map((item) => [getId(item), item]));
    const reordered: T[] = [];
    for (const id of droppedIds) {
      const item = byId.get(id);
      if (!item) return items;
      reordered.push(item);
    }
    return reordered;
  }, [items, droppedIds, getId]);

  const sortableIds = useMemo(
    () => orderedItems?.map(getId) ?? [],
    [orderedItems, getId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled || !items || !orderedItems) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex((item) => getId(item) === active.id);
    const newIndex = orderedItems.findIndex((item) => getId(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedItems, oldIndex, newIndex);
    setDropped({ source: items, ids: reordered.map(getId) });
    onReorder(reordered);
  };

  return { orderedItems, sortableIds, sensors, handleDragEnd };
}
