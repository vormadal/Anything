import { renderHook, act } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { useSortableOrder } from "./useSortableOrder";

interface Row {
  id: number;
  name: string;
}

const getRowId = (row: Row) => row.id;

const rows: Row[] = [
  { id: 1, name: "a" },
  { id: 2, name: "b" },
  { id: 3, name: "c" },
];

const drop = (activeId: number, overId: number) =>
  ({ active: { id: activeId }, over: { id: overId } }) as unknown as DragEndEvent;

function setup(items: Row[] | undefined, disabled = false) {
  const onReorder = jest.fn();
  const view = renderHook(
    ({ current }: { current: Row[] | undefined }) =>
      useSortableOrder({ items: current, getId: getRowId, onReorder, disabled }),
    { initialProps: { current: items } }
  );
  return { ...view, onReorder };
}

describe("useSortableOrder", () => {
  it("shows the dropped order immediately, without waiting for the data to update", () => {
    const { result, onReorder } = setup(rows);

    act(() => result.current.handleDragEnd(drop(1, 3)));

    // The list still holds the old order — this is the state dnd-kit renders in the
    // same commit as the drop, and the rows only stay put if it already reflects it.
    expect(result.current.orderedItems?.map(getRowId)).toEqual([2, 3, 1]);
    expect(result.current.sortableIds).toEqual([2, 3, 1]);
    expect(onReorder).toHaveBeenCalledWith([rows[1], rows[2], rows[0]]);
  });

  it("hands back to the data once the list is replaced with the persisted order", () => {
    const { result, rerender } = setup(rows);

    act(() => result.current.handleDragEnd(drop(1, 2)));
    expect(result.current.orderedItems?.map(getRowId)).toEqual([2, 1, 3]);

    rerender({ current: [rows[1], rows[0], rows[2]] });

    expect(result.current.orderedItems?.map(getRowId)).toEqual([2, 1, 3]);
  });

  it("reverts when a failed reorder rolls the list back", () => {
    const { result, rerender } = setup(rows);

    act(() => result.current.handleDragEnd(drop(1, 3)));
    expect(result.current.orderedItems?.map(getRowId)).toEqual([2, 3, 1]);

    rerender({ current: [...rows] });

    expect(result.current.orderedItems?.map(getRowId)).toEqual([1, 2, 3]);
  });

  it("ignores a drop while disabled", () => {
    const { result, onReorder } = setup(rows, true);

    act(() => result.current.handleDragEnd(drop(1, 3)));

    expect(result.current.orderedItems?.map(getRowId)).toEqual([1, 2, 3]);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("ignores a drop that did not move anything", () => {
    const { result, onReorder } = setup(rows);

    act(() => result.current.handleDragEnd(drop(2, 2)));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("tolerates an undefined list", () => {
    const { result, onReorder } = setup(undefined);

    act(() => result.current.handleDragEnd(drop(1, 3)));

    expect(result.current.orderedItems).toBeUndefined();
    expect(result.current.sortableIds).toEqual([]);
    expect(onReorder).not.toHaveBeenCalled();
  });
});
