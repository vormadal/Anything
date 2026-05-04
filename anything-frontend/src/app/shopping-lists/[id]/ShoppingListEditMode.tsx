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
  useUpdateShoppingListItem,
  useRemoveShoppingListItem,
  useUpdateShoppingList,
} from "@/hooks/useShoppingLists";
import { useApprovedRecommendations } from "@/hooks/useRecommendations";
import { toast } from "sonner";
import type { ShoppingList, ShoppingListItem } from "@/lib/api-client/models/index";

interface Props {
  listId: number;
  list: ShoppingList | undefined;
  openEditNameDialogRef: React.MutableRefObject<() => void>;
}

export function ShoppingListEditMode({ listId, list, openEditNameDialogRef }: Props) {
  const SUGGESTION_CLOSE_DELAY_MS = 150;

  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [listNameValue, setListNameValue] = useState("");
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [editingItem, setEditingItem] = useState<{
    id: number;
    name: string;
    amount: string;
    unit: string;
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);

  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const addItem = useAddShoppingListItem(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const removeItem = useRemoveShoppingListItem(listId);
  const updateList = useUpdateShoppingList();
  const { data: recommendations } = useApprovedRecommendations();

  // Keep the ref current so page.tsx header can trigger the dialog without a stale closure
  useEffect(() => {
    openEditNameDialogRef.current = () => {
      setListNameValue(list?.name ?? "");
      setEditNameDialogOpen(true);
    };
  }, [list?.name, openEditNameDialogRef]);

  useEffect(() => {
    if (editNameDialogOpen) {
      setTimeout(() => listNameInputRef.current?.focus(), 0);
    }
  }, [editNameDialogOpen]);

  const filteredSuggestions =
    recommendations?.filter(
      (r) =>
        r.name &&
        newItemName.trim().length > 0 &&
        r.name.toLowerCase().includes(newItemName.toLowerCase()) &&
        !items?.some((i) => i.name?.toLowerCase() === r.name?.toLowerCase())
    ) ?? [];

  const parseAmount = (value: string): number | null => {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  };

  const formatAmount = (amount: number | null | undefined): string => {
    if (amount == null) return "";
    return String(amount);
  };

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
        amount: parseAmount(newItemAmount),
        unit: newItemUnit.trim() || null,
      });
      setNewItemName("");
      setNewItemAmount("");
      setNewItemUnit("");
      setShowSuggestions(false);
      toast.success("Item added");
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to add item. Please try again.");
    }
  };

  const handleSelectSuggestion = (name: string, preferredUnit?: string | null) => {
    setShowSuggestions(false);
    setNewItemName(name);
    if (!newItemUnit.trim() && preferredUnit?.trim()) {
      setNewItemUnit(preferredUnit.trim());
    }
    amountInputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    cancelEditRef.current = true;
    setEditingItem(null);
  };

  const handleSaveEdit = async (item: ShoppingListItem) => {
    if (!editingItem) return;
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: editingItem.name,
        isChecked: item.isChecked ?? false,
        amount: parseAmount(editingItem.amount),
        unit: editingItem.unit.trim() || null,
      });
      setEditingItem(null);
    } catch {
      toast.error("Failed to update item. Please try again.");
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

  const sortedItems = items ?? [];

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
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowSuggestions(false), SUGGESTION_CLOSE_DELAY_MS)
              }
              placeholder="Add an item..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      onMouseDown={() =>
                        handleSelectSuggestion(suggestion.name!, suggestion.preferredUnit)
                      }
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                    >
                      {suggestion.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input
            ref={amountInputRef}
            type="number"
            value={newItemAmount}
            onChange={(e) => setNewItemAmount(e.target.value)}
            placeholder="Qty"
            min="0"
            step="any"
            className="w-16 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            value={newItemUnit}
            onChange={(e) => setNewItemUnit(e.target.value)}
            placeholder="Unit"
            className="w-16 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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

      {sortedItems.length > 0 && (
        <ul>
          {sortedItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 py-2 px-3 transition-colors"
            >
              {editingItem !== null && editingItem.id === item.id ? (
                <div
                  className="flex items-center gap-1 flex-1 min-w-0"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      const cancelled = cancelEditRef.current;
                      cancelEditRef.current = false;
                      if (!cancelled) handleSaveEdit(item);
                    }
                  }}
                >
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem(editingItem ? { ...editingItem, name: e.target.value } : null)
                    }
                    className="flex-1 min-w-0 px-2 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(item);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                  <input
                    type="number"
                    value={editingItem.amount}
                    onChange={(e) =>
                      setEditingItem(
                        editingItem ? { ...editingItem, amount: e.target.value } : null
                      )
                    }
                    placeholder="Qty"
                    min="0"
                    step="any"
                    className="w-14 px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(item);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) =>
                      setEditingItem(editingItem ? { ...editingItem, unit: e.target.value } : null)
                    }
                    placeholder="Unit"
                    className="w-14 px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(item);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                </div>
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  className="flex-1 text-sm cursor-pointer hover:text-blue-600 text-gray-900 dark:text-white"
                  onClick={() =>
                    setEditingItem({
                      id: item.id!,
                      name: item.name!,
                      amount: formatAmount(item.amount),
                      unit: item.unit ?? "",
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditingItem({
                        id: item.id!,
                        name: item.name!,
                        amount: formatAmount(item.amount),
                        unit: item.unit ?? "",
                      });
                    }
                  }}
                >
                  {item.amount != null && item.unit && (
                    <span className="text-gray-400 dark:text-gray-500 mr-1">
                      {item.amount} {item.unit}
                    </span>
                  )}
                  {item.amount != null && !item.unit && (
                    <span className="text-gray-400 dark:text-gray-500 mr-1">{item.amount}×</span>
                  )}
                  {item.name}
                </span>
              )}

              {editingItem?.id !== item.id && (
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
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
