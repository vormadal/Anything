"use client";

import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { useShoppingLists, useCreateShoppingList, useReorderShoppingLists } from "@/hooks/useShoppingLists";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Plus, GripVertical } from "lucide-react";
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
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { ShoppingListResponse } from "@/lib/api-client/models/index";

function DraggableShoppingListItem({
  list,
  onClick,
  disabled,
}: {
  list: ShoppingListResponse;
  onClick: () => void;
  disabled: boolean;
}) {
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

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        type="button"
        className="flex items-center justify-center p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Drag to reorder"
        disabled={disabled}
        title={disabled ? "Reordering requires an internet connection" : undefined}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="flex-1 flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={onClick}
      >
        <span className="text-gray-900 dark:text-white font-medium text-sm">
          {list.name}
        </span>
        <CountBadge count={list.uncheckedItemCount} />
      </button>
    </div>
  );
}

export default function ShoppingListsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: lists, isLoading, error } = useShoppingLists();
  const createList = useCreateShoppingList();
  const reorderLists = useReorderShoppingLists();
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();
  const isOnline = useOnlineStatus();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isOnline) return;
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
      const newList = await createList.mutateAsync({ name: newListName });
      setNewListName("");
      setIsCreating(false);
      toast.success("Shopping list created");
      if (newList?.id) {
        router.push(`/shopping-lists/${newList.id}`);
      }
    } catch {
      toast.error("Failed to create shopping list. Please try again.");
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewListName("");
  };

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCreating(true)}
          aria-label="Create shopping list"
          disabled={!isOnline}
          title={isOnline ? undefined : "Creating lists requires an internet connection"}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, isOnline]);

  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  const hasActiveLists = lists && lists.length > 0;

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <PageTitle>Shopping Lists</PageTitle>
      {isCreating && (
        <form onSubmit={handleCreateList} className="mb-4">
          <div className="flex gap-2">
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
            <Button
              type="submit"
              size="sm"
              disabled={createList.isPending || !isOnline}
              title={isOnline ? undefined : "Creating lists requires an internet connection"}
            >
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

      {error && !lists && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          Failed to load shopping lists. Please try again later.
        </div>
      )}

      {!isOnline && !lists && !isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          You&apos;re offline — shopping lists will appear once you&apos;re back online.
        </div>
      )}

      {lists && lists.length === 0 && !isCreating && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No shopping lists yet.
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
                <DraggableShoppingListItem
                  key={list.id}
                  list={list}
                  onClick={() => router.push(`/shopping-lists/${list.id}`)}
                  disabled={!isOnline}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
