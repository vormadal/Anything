"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Trash2 } from "lucide-react";
import {
  useShoppingListItems,
  useAddShoppingListItem,
  useUpdateShoppingListItem,
  useRemoveShoppingListItem,
} from "@/hooks/useShoppingLists";
import { useRecommendationSearch } from "@/hooks/useRecommendations";
import { useUnits } from "@/hooks/useUnits";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import { usePendingItemIds } from "@/lib/offline/outboxStore";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

interface Props {
  listId: number;
}

export function ShoppingListEditMode({ listId }: Props) {
  const SUGGESTION_CLOSE_DELAY_MS = 150;

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
  const { data: units } = useUnits();
  const pendingItemIds = usePendingItemIds(listId);

  // Ranked, typo-tolerant suggestions from the server (debounced), rather than
  // loading the whole recommendation list and filtering it in the browser.
  const debouncedName = useDebounce(newItemName, 250);
  // Scope the typeahead to this list's own suggestions plus the shared ones.
  const { data: searchResults } = useRecommendationSearch(debouncedName, listId);

  const filteredSuggestions =
    newItemName.trim().length > 0
      ? (searchResults ?? []).filter(
          (r) =>
            r.name && !items?.some((i) => i.name?.toLowerCase() === r.name?.toLowerCase())
        )
      : [];

  const parseAmount = (value: string): number | null => {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  };

  const formatAmount = (amount: number | null | undefined): string => {
    if (amount == null) return "";
    return String(amount);
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
    } catch {
      toast.error("Failed to remove item. Please try again.");
    }
  };

  const sortedItems = items ?? [];

  return (
    <>
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
            list="unit-options"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-16 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <Button type="submit" size="icon" disabled={addItem.isPending} aria-label="Add item">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <datalist id="unit-options">
        {units?.map((u) => (
          <option key={u.id} value={u.name ?? ""} />
        ))}
      </datalist>

      <ListItemsStatus
        isLoading={isLoading}
        error={error}
        isEmpty={!!items && items.length === 0}
      />

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
                    list="unit-options"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
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
                  {pendingItemIds.has(item.id!) && (
                    <Clock
                      className="inline-block h-3 w-3 ml-1.5 mb-0.5 text-gray-400 dark:text-gray-500"
                      aria-label="Pending sync"
                    />
                  )}
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

