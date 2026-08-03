"use client";

import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { useShoppingLists, useReorderShoppingLists } from "@/hooks/useShoppingLists";
import { CreateListDialog } from "@/components/CreateListDialog";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActions } from "@/context/PageActionsContext";
import { PageTitle } from "@/components/PageTitle";
import { Plus, GripVertical, ShoppingCart, ListChecks } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSortableOrder } from "@/hooks/useSortableOrder";
import type { ShoppingListResponse } from "@/lib/api-client/models/index";

const getListId = (list: ShoppingListResponse) => list.id ?? 0;

function DraggableListItem({
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

  const ListIcon = list.type === 0 ? ListChecks : ShoppingCart;

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
  const { data: lists, isLoading, error } = useShoppingLists();
  const reorderLists = useReorderShoppingLists();
  const router = useRouter();
  const { setHeaderActions } = useHeaderActions();
  const isOnline = useOnlineStatus();

  const { orderedItems: orderedLists, sortableIds, sensors, handleDragEnd } =
    useSortableOrder({
      items: lists,
      getId: getListId,
      onReorder: (reordered) => reorderLists.mutate(reordered.map(getListId)),
      disabled: !isOnline,
    });

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCreating(true)}
          aria-label="New list"
          disabled={!isOnline}
          title={isOnline ? undefined : "Creating lists requires an internet connection"}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, isOnline]);

  const hasActiveLists = lists && lists.length > 0;

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <PageTitle>Lists</PageTitle>
      <CreateListDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onCreated={(listId) => router.push(`/lists/${listId}`)}
      />

      {isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {error && !lists && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          Failed to load lists. Please try again later.
        </div>
      )}

      {!isOnline && !lists && !isLoading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          You&apos;re offline — lists will appear once you&apos;re back online.
        </div>
      )}

      {lists?.length === 0 && (
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
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {orderedLists?.map((list) => (
                <DraggableListItem
                  key={list.id}
                  list={list}
                  onClick={() => router.push(`/lists/${list.id}`)}
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
