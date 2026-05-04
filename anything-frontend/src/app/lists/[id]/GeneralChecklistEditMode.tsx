"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import {
  useShoppingListItems,
  useAddShoppingListItem,
  useRemoveShoppingListItem,
  useUpdateShoppingList,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import type { ShoppingList } from "@/lib/api-client/models/index";

interface Props {
  listId: number;
  list: ShoppingList | undefined;
  openEditNameDialogRef: React.MutableRefObject<() => void>;
}

export function GeneralChecklistEditMode({ listId, list, openEditNameDialogRef }: Props) {
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [listNameValue, setListNameValue] = useState("");
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const [newItemName, setNewItemName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const addItem = useAddShoppingListItem(listId);
  const removeItem = useRemoveShoppingListItem(listId);
  const updateList = useUpdateShoppingList();

  useEffect(() => {
    openEditNameDialogRef.current = () => {
      setListNameValue(list?.name ?? "");
      setEditNameDialogOpen(true);
    };
  });

  useEffect(() => {
    if (editNameDialogOpen) {
      setTimeout(() => listNameInputRef.current?.focus(), 0);
    }
  }, [editNameDialogOpen]);

  const handleSaveListName = async () => {
    const trimmed = listNameValue.trim();
    if (!trimmed || trimmed === list?.name) {
      setEditNameDialogOpen(false);
      return;
    }
    try {
      await updateList.mutateAsync({ id: listId, name: trimmed });
      setEditNameDialogOpen(false);
      toast.success("List name updated");
    } catch {
      toast.error("Failed to update list name. Please try again.");
    }
  };

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
      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit list name</DialogTitle>
          </DialogHeader>
          <input
            ref={listNameInputRef}
            type="text"
            value={listNameValue}
            onChange={(e) => setListNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveListName();
              if (e.key === "Escape") setEditNameDialogOpen(false);
            }}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            aria-label="Edit list name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveListName} disabled={updateList.isPending} aria-label="Save list name">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {isLoading && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
          Failed to load items. Please try again later.
        </div>
      )}

      {items && items.length === 0 && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">No items yet.</div>
      )}

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
