"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  useShoppingListItems,
  useAddShoppingListItem,
  useUpdateShoppingListItem,
  useReorderShoppingListItems,
  useRemoveShoppingListItem,
} from "@/hooks/useShoppingLists";
import { useEditListNameDialog } from "@/hooks/useEditListNameDialog";
import { toast } from "sonner";
import { EditListNameDialog } from "@/components/EditListNameDialog";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import type { ShoppingList, ShoppingListItem } from "@/lib/api-client/models/index";
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

interface Props {
  listId: number;
  list: ShoppingList | undefined;
  openEditNameDialogRef: React.MutableRefObject<() => void>;
}

function DraggableChecklistItem({
  item,
  onRemove,
  disabled,
  editingItem,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
}: {
  item: ShoppingListItem;
  onRemove: (itemId: number) => void;
  disabled: boolean;
  editingItem: { id: number; name: string } | null;
  onStartEdit: (item: ShoppingListItem) => void;
  onSaveEdit: (item: ShoppingListItem) => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
}) {
  const isEditing = editingItem?.id === item.id;
  const cancelEditRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id ?? 0 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 px-3 transition-colors"
    >
      <button
        type="button"
        className="flex items-center justify-center p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder item"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {isEditing ? (
        <div
          className="flex items-center gap-1 flex-1 min-w-0"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              const cancelled = cancelEditRef.current;
              cancelEditRef.current = false;
              if (!cancelled) onSaveEdit(item);
            }
          }}
        >
          <input
            type="text"
            value={editingItem!.name}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(item);
              if (e.key === "Escape") {
                cancelEditRef.current = true;
                onCancelEdit();
              }
            }}
          />
        </div>
      ) : (
        <span
          role="button"
          tabIndex={0}
          className="flex-1 text-sm cursor-pointer hover:text-blue-600 text-gray-900 dark:text-white"
          onClick={() => onStartEdit(item)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onStartEdit(item);
            }
          }}
        >
          {item.name}
        </span>
      )}
      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id!)}
          disabled={disabled}
          aria-label="Remove item"
          className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </li>
  );
}

export function GeneralChecklistEditMode({ listId, list, openEditNameDialogRef }: Props) {
  const [newItemName, setNewItemName] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: number; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const addItem = useAddShoppingListItem(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const reorderItems = useReorderShoppingListItems(listId);
  const removeItem = useRemoveShoppingListItem(listId);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const editNameDialog = useEditListNameDialog(listId, list?.name, openEditNameDialogRef);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      await addItem.mutateAsync({
        name: newItemName,
        amount: null,
        unit: null,
      });
      setNewItemName("");
      toast.success("Item added");
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to add item. Please try again.");
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItem.mutateAsync(itemId);
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item. Please try again.");
    }
  };

  const handleStartEdit = (item: ShoppingListItem) => {
    setEditingItem({ id: item.id!, name: item.name! });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleSaveEdit = async (item: ShoppingListItem) => {
    if (!editingItem) return;
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: editingItem.name,
        isChecked: item.isChecked ?? false,
        amount: item.amount ?? null,
        unit: item.unit ?? null,
      });
      setEditingItem(null);
    } catch {
      toast.error("Failed to update item. Please try again.");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !items) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    reorderItems.mutate(
      reordered.map((item) => item.id ?? 0),
      {
        onError: () => {
          toast.error("Failed to reorder items. Please try again.");
        },
      }
    );
  };

  const isBusy = addItem.isPending || updateItem.isPending || removeItem.isPending || reorderItems.isPending;

  return (
    <>
      <EditListNameDialog
        open={editNameDialog.open}
        onOpenChange={editNameDialog.setOpen}
        value={editNameDialog.value}
        onChange={editNameDialog.setValue}
        onSave={editNameDialog.handleSave}
        isPending={editNameDialog.isPending}
        inputRef={editNameDialog.inputRef}
      />

      <form onSubmit={handleAddItem} className="mb-4">
        <div className="flex gap-1 items-center">
          <input
            ref={inputRef}
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add an item..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={addItem.isPending} aria-label="Add item">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <ListItemsStatus
        isLoading={isLoading}
        error={error}
        isEmpty={!!items && items.length === 0}
      />

      {items && items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id ?? 0)}
            strategy={verticalListSortingStrategy}
          >
            <ul>
              {items.map((item) => (
                <DraggableChecklistItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveItem}
                  disabled={isBusy || editingItem !== null}
                  editingItem={editingItem}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditNameChange={(name) =>
                    setEditingItem(editingItem ? { ...editingItem, name } : null)
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}
