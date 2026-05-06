"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  useShoppingListItems,
  useAddShoppingListItem,
  useRemoveShoppingListItem,
} from "@/hooks/useShoppingLists";
import { useEditListNameDialog } from "@/hooks/useEditListNameDialog";
import { toast } from "sonner";
import { EditListNameDialog } from "@/components/EditListNameDialog";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import type { ShoppingList } from "@/lib/api-client/models/index";

interface Props {
  listId: number;
  list: ShoppingList | undefined;
  openEditNameDialogRef: React.MutableRefObject<() => void>;
}

export function GeneralChecklistEditMode({ listId, list, openEditNameDialogRef }: Props) {
  const [newItemName, setNewItemName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const addItem = useAddShoppingListItem(listId);
  const removeItem = useRemoveShoppingListItem(listId);

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
        <ul>
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 py-2 px-3 transition-colors"
            >
              <span className="flex-1 text-sm text-gray-900 dark:text-white">
                {item.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(item.id!)}
                disabled={removeItem.isPending}
                aria-label="Remove item"
                className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
