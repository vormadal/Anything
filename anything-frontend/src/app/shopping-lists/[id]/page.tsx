"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useShoppingListItems,
  useAddShoppingListItem,
  useUpdateShoppingListItem,
  useRemoveShoppingListItem,
  useCompleteShoppingList,
  useDeleteShoppingList,
  useUpdateShoppingList,
} from "@/hooks/useShoppingLists";
import { useApprovedRecommendations } from "@/hooks/useRecommendations";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { ShoppingListItem, ShoppingList } from "@/lib/api-client/models/index";
import { apiClient } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useHeaderActions } from "@/context/PageActionsContext";
import { Pencil, Check, Plus, Trash2, MoreVertical, Archive } from "lucide-react";

export default function ShoppingListDetailPage() {
  const SUGGESTION_CLOSE_DELAY_MS = 150;
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingListName, setEditingListName] = useState(false);
  const [listNameValue, setListNameValue] = useState("");
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: number; name: string; amount: string; unit: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);
  const { setHeaderActions, setLeftAction } = useHeaderActions();

  // Keep a ref to the delete handler so the header effect closure is always current
  const handleDeleteListRef = useRef<() => void>(() => undefined);

  const { data: list } = useQuery({
    queryKey: ["shoppingList", listId],
    queryFn: () => apiClient.api.shoppingLists.byId(listId).get() as Promise<ShoppingList>,
    enabled: listId > 0,
  });

  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const addItem = useAddShoppingListItem(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const removeItem = useRemoveShoppingListItem(listId);
  const completeList = useCompleteShoppingList();
  const deleteList = useDeleteShoppingList();
  const updateList = useUpdateShoppingList();
  const { data: recommendations } = useApprovedRecommendations();

  // Update the delete handler ref on every render so it always closes over the latest deleteList/listId/router.
  // No dependency array is intentional: this is the mutable-ref pattern used to keep callbacks fresh
  // without adding unstable references (mutation objects, router) to the header useEffect deps.
  useEffect(() => {
    handleDeleteListRef.current = async () => {
      try {
        await deleteList.mutateAsync(listId);
        toast.success("Shopping list deleted");
        router.push("/shopping-lists");
      } catch {
        toast.error("Failed to delete shopping list. Please try again.");
      }
    };
  });

  const uncheckedItems = items?.filter((i) => !i.isChecked) ?? [];
  const checkedItems = items?.filter((i) => i.isChecked) ?? [];
  const sortedItems = [...uncheckedItems, ...checkedItems];
  const isFewItems = uncheckedItems.length > 0 && uncheckedItems.length <= 3;
  const isCompleted = !!list?.deletedOn;

  const filteredSuggestions =
    recommendations?.filter(
      (r) =>
        r.name &&
        newItemName.trim().length > 0 &&
        r.name.toLowerCase().includes(newItemName.toLowerCase()) &&
        !items?.some((i) => i.name?.toLowerCase() === r.name?.toLowerCase() && !i.isChecked)
    ) ?? [];

  const parseAmount = (value: string): number | null => {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  };

  const formatAmount = (amount: number | null | undefined): string => {
    if (amount == null) return "";
    return Number.isInteger(amount) ? String(amount) : String(amount);
  };

  const handleStartEditListName = () => {
    setListNameValue(list?.name ?? "");
    setEditingListName(true);
  };

  useEffect(() => {
    if (editingListName) {
      listNameInputRef.current?.focus();
    }
  }, [editingListName]);

  const handleSaveListName = async () => {
    const trimmed = listNameValue.trim();
    if (!trimmed || trimmed === list?.name) {
      setEditingListName(false);
      return;
    }
    try {
      await updateList.mutateAsync({ id: listId, name: trimmed });
      setEditingListName(false);
      toast.success("List name updated");
    } catch {
      toast.error("Failed to update list name. Please try again.");
    }
  };

  const handleCancelListNameEdit = () => {
    setEditingListName(false);
  };

  const handleCompleteList = async () => {
    try {
      const newList = await completeList.mutateAsync(listId);
      toast.success("Shopping complete!");
      if (newList?.id) {
        router.push(`/shopping-lists/${newList.id}`);
      } else {
        router.push("/shopping-lists");
      }
    } catch {
      toast.error("Failed to complete list. Please try again.");
    }
  };

  const handleToggleCheck = async (item: ShoppingListItem) => {
    if (isEditMode) return;
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: item.name!,
        isChecked: !item.isChecked,
        amount: item.amount != null && item.amount > 0 ? item.amount : null,
        unit: item.unit ?? null,
      });
    } catch {
      toast.error("Failed to update item. Please try again.");
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

  useEffect(() => {
    setLeftAction({ type: "back", href: "/shopping-lists" });
    setHeaderActions(
      isCompleted ? null : (
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={isEditMode ? "default" : "ghost"}
            size="icon"
            onClick={() => {
              setIsEditMode(!isEditMode);
              setEditingItem(null);
              setEditingListName(false);
            }}
            aria-label={isEditMode ? "Done editing" : "Edit list"}
          >
            {isEditMode ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onSelect={() => handleDeleteListRef.current()}
              >
                <Trash2 className="h-4 w-4" />
                Delete list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    );
    return () => {
      setHeaderActions(null);
      setLeftAction({ type: "menu" });
    };
  }, [isEditMode, isCompleted, setHeaderActions, setLeftAction]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="mb-4">
          {isEditMode && !isCompleted ? (
            editingListName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={listNameInputRef}
                  type="text"
                  value={listNameValue}
                  onChange={(e) => setListNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveListName();
                    if (e.key === "Escape") handleCancelListNameEdit();
                  }}
                  className="flex-1 text-2xl font-bold px-2 py-1 rounded border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  aria-label="Edit list name"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleSaveListName}
                  disabled={updateList.isPending}
                  aria-label="Save list name"
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartEditListName}
                className="group flex items-center gap-2 text-left"
                aria-label="Edit list name"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {list?.name ?? "Shopping List"}
                </h2>
                <Pencil className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
              </button>
            )
          ) : (
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {list?.name ?? "Shopping List"}
            </h2>
          )}
          {isCompleted && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <Archive className="h-4 w-4" />
              <span>
                Completed{list?.deletedOn ? ` on ${new Date(list.deletedOn).toLocaleDateString()}` : ""} · Read-only
              </span>
            </div>
          )}
        </div>

        {isEditMode && !isCompleted && (
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
                          onMouseDown={() => handleSelectSuggestion(suggestion.name!, suggestion.preferredUnit)}
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
        )}

        {isLoading && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load items. Make sure the API is running on port 5238.
          </div>
        )}

        {items && items.length === 0 && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No items yet.
          </div>
        )}

        {sortedItems.length > 0 && (
          <ul className="space-y-1">
            {sortedItems.map((item, index) => (
              <Fragment key={item.id}>
              <li
                className={`flex items-center gap-2 py-2 px-3 border rounded-md transition-colors ${
                  item.isChecked
                    ? "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => handleToggleCheck(item)}
                    disabled={isCompleted || updateItem.isPending || completeList.isPending}
                    aria-label={item.isChecked ? "Uncheck item" : "Check item"}
                    className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      item.isChecked
                        ? "bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    } ${isCompleted ? "cursor-default opacity-60" : ""}`}
                  >
                    {item.isChecked && <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />}
                  </button>
                )}

                {isEditMode && editingItem !== null && editingItem.id === item.id ? (
                  <div
                    className="flex items-center gap-1 flex-1 min-w-0"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        const cancelled = cancelEditRef.current;
                        cancelEditRef.current = false;
                        if (!cancelled) {
                          handleSaveEdit(item);
                        }
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
                        setEditingItem(editingItem ? { ...editingItem, amount: e.target.value } : null)
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
                    role={isEditMode ? "button" : undefined}
                    tabIndex={isEditMode ? 0 : undefined}
                    className={`flex-1 text-sm ${
                      item.isChecked
                        ? "line-through text-gray-400 dark:text-gray-600"
                        : "text-gray-900 dark:text-white"
                    } ${isEditMode ? "cursor-pointer hover:text-blue-600" : ""}`}
                    onClick={() => {
                      if (isEditMode)
                        setEditingItem({
                          id: item.id!,
                          name: item.name!,
                          amount: formatAmount(item.amount),
                          unit: item.unit ?? "",
                        });
                    }}
                    onKeyDown={(e) => {
                      if (isEditMode && (e.key === "Enter" || e.key === " ")) {
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
                      <span className="text-gray-400 dark:text-gray-500 mr-1">
                        {item.amount}×
                      </span>
                    )}
                    {item.name}
                  </span>
                )}

                {isEditMode && editingItem?.id !== item.id && (
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
                {!isEditMode && !isCompleted && items && items.length > 0 &&
                  (items.every((i) => i.isChecked) || isFewItems) &&
                  (uncheckedItems.length === 0 ? index === sortedItems.length - 1 : index === uncheckedItems.length - 1) && (
                  <li role="presentation" className="flex justify-end py-2">
                    <Button
                      onClick={handleCompleteList}
                      disabled={completeList.isPending}
                      size="sm"
                    >
                      {completeList.isPending ? "Completing..." : "Complete List"}
                    </Button>
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
