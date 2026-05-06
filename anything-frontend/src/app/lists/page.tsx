"use client";

import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { useShoppingLists, useCreateShoppingList, useReorderShoppingLists } from "@/hooks/useShoppingLists";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Plus, GripVertical, ShoppingCart, ListChecks } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ShoppingListResponse } from "@/lib/api-client/models/index";

function DraggableListItem({ list, onClick }: { list: ShoppingListResponse; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id ?? 0 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ListIcon = list.type === 0 ? ListChecks : ShoppingCart;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        type="button"
        className="flex items-center justify-center p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={list.name ?? "List"}
        className="flex-1 flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <ListIcon className={`h-4 w-4 shrink-0 ${list.type === 0 ? "text-blue-500" : "text-green-500"}`} />
          <span className="text-gray-900 dark:text-white font-medium text-sm">
            {list.name}
          </span>
        </div>
        <CountBadge count={list.uncheckedItemCount} />
      </button>
    </div>
  );
}

export default function ListsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListType, setNewListType] = useState<number>(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: lists, isLoading, error } = useShoppingLists();
  const createList = useCreateShoppingList();
  const reorderLists = useReorderShoppingLists();
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !lists) return;

    const oldIndex = lists.findIndex((l) => l.id === active.id);
    const newIndex = lists.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(lists, oldIndex, newIndex);
    reorderLists.mutate(reordered.map((l) => l.id ?? 0));
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      const newList = await createList.mutateAsync({ name: newListName, type: newListType });
      setNewListName("");
      setIsCreating(false);
      toast.success("List created");
      if (newList?.id) {
        router.push(`/lists/${newList.id}`);
      }
    } catch {
      toast.error("Failed to create list. Please try again.");
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewListName("");
    setNewListType(1);
  };

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCreating(true)}
          aria-label="New list"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  const hasActiveLists = lists && lists.length > 0;

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <PageTitle>Lists</PageTitle>
      {isCreating && (
        <form onSubmit={handleCreateList} className="mb-4">
          <div className="flex gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancelCreate();
              }}
            />
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="radio" name="listType" value="1" checked={newListType === 1} onChange={() => setNewListType(1)} className="accent-green-500" />
                <ShoppingCart className="h-4 w-4 text-green-500" />
                Shopping
              </label>
              <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="radio" name="listType" value="0" checked={newListType === 0} onChange={() => setNewListType(0)} className="accent-blue-500" />
                <ListChecks className="h-4 w-4 text-blue-500" />
                Checklist
              </label>
            </div>
            <Button type="submit" size="sm" disabled={createList.isPending}>
              {createList.isPending ? "Creating..." : "Create list"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCancelCreate}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          Failed to load lists. Please try again later.
        </div>
      )}

      {lists && lists.length === 0 && !isCreating && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No lists yet.
        </div>
      )}

      {hasActiveLists && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lists.map((l) => l.id ?? 0)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {lists.map((list) => (
                <DraggableListItem
                  key={list.id}
                  list={list}
                  onClick={() => router.push(`/lists/${list.id}`)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
