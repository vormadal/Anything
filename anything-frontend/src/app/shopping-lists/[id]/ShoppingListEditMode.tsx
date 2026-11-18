"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Trash2 } from "lucide-react";
import {
  useShoppingListItems,
  useAddShoppingListItem,
  useUpdateShoppingListItem,
  useRemoveShoppingListItem,
  useItemSuggestions,
} from "@/hooks/useShoppingLists";
import { useUnits } from "@/hooks/useUnits";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import { usePendingItemIds } from "@/lib/offline/outboxStore";
import type { ItemSuggestionResponse, ShoppingListItem } from "@/lib/api-client/models/index";
import {
  ItemSuggestions,
  ITEM_SUGGESTIONS_LISTBOX_ID,
  suggestionOptionId,
} from "./ItemSuggestions";

const ADD_FAILED_MESSAGE = "Failed to add item. Please try again.";
const sameName = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);

  const itemsQuery = useShoppingListItems(listId);
  const { data: items } = itemsQuery;
  const addItem = useAddShoppingListItem(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const removeItem = useRemoveShoppingListItem(listId);
  const { data: units } = useUnits();
  const pendingItemIds = usePendingItemIds(listId);

  // Ranked server-side by match, then by how often each item was added to this
  // list recently. A blank box asks for the list's usuals, so suggestions show
  // as soon as it is focused. The server already leaves out items on the list;
  // filtering again here also covers optimistic adds it hasn't seen yet.
  const debouncedName = useDebounce(newItemName, 250);
  const { data: suggestionResults } = useItemSuggestions(listId, debouncedName, showSuggestions);
  // Until the debounce catches up with the first keystroke the query is still
  // the blank one; its usuals aren't matches for what was typed.
  const awaitingTypedQuery = newItemName.trim() !== "" && debouncedName.trim() === "";
  const suggestions = awaitingTypedQuery
    ? []
    : (suggestionResults ?? []).filter(
        (s) => s.name && !items?.some((i) => sameName(i.name, s.name))
      );
  const existingMatch = newItemName.trim()
    ? items?.find((i) => sameName(i.name, newItemName))
    : undefined;
  const dropdownOpen = showSuggestions && (suggestions.length > 0 || !!existingMatch);

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
      toast.error(ADD_FAILED_MESSAGE);
    }
  };

  // One tap adds the item. Anything already typed into Qty/Unit wins over the
  // suggested quantity, so "3" then tapping "Milk" adds 3 of it.
  const handleAddSuggestion = async (suggestion: ItemSuggestionResponse) => {
    const amount = parseAmount(newItemAmount) ?? suggestion.suggestedAmount ?? null;
    const unit = newItemUnit.trim() || suggestion.suggestedUnit || null;
    setNewItemName("");
    setNewItemAmount("");
    setNewItemUnit("");
    setActiveIndex(-1);
    try {
      await addItem.mutateAsync({ name: suggestion.name!, amount, unit });
    } catch {
      toast.error(ADD_FAILED_MESSAGE);
    }
  };

  const handleFillSuggestion = (suggestion: ItemSuggestionResponse) => {
    setShowSuggestions(false);
    setActiveIndex(-1);
    setNewItemName(suggestion.name ?? "");
    if (!newItemAmount.trim() && suggestion.suggestedAmount != null) {
      setNewItemAmount(String(suggestion.suggestedAmount));
    }
    if (!newItemUnit.trim() && suggestion.suggestedUnit) {
      setNewItemUnit(suggestion.suggestedUnit);
    }
    amountInputRef.current?.focus();
  };

  const startEditing = (item: ShoppingListItem) =>
    setEditingItem({
      id: item.id!,
      name: item.name!,
      amount: formatAmount(item.amount),
      unit: item.unit ?? "",
    });

  const handleEditExisting = (item: ShoppingListItem) => {
    setShowSuggestions(false);
    setNewItemName("");
    startEditing(item);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "Enter" && dropdownOpen && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      handleAddSuggestion(suggestions[activeIndex]);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    setShowSuggestions(true);
    const last = suggestions.length - 1;
    setActiveIndex((i) => (e.key === "ArrowDown" ? Math.min(i + 1, last) : Math.max(i - 1, -1)));
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
                setActiveIndex(-1);
              }}
              onKeyDown={handleNameKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowSuggestions(false), SUGGESTION_CLOSE_DELAY_MS)
              }
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls={ITEM_SUGGESTIONS_LISTBOX_ID}
              aria-autocomplete="list"
              aria-activedescendant={
                dropdownOpen && activeIndex >= 0 ? suggestionOptionId(activeIndex) : undefined
              }
              placeholder="Add an item..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              autoComplete="off"
            />
            {dropdownOpen && (
              <ItemSuggestions
                suggestions={suggestions}
                activeIndex={activeIndex}
                existingMatch={existingMatch}
                onAdd={handleAddSuggestion}
                onFill={handleFillSuggestion}
                onEditExisting={handleEditExisting}
              />
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

      <ListItemsStatus query={itemsQuery} isEmpty={!!items && items.length === 0} />

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
                  onClick={() => startEditing(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startEditing(item);
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

