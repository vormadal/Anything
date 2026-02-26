"use client";

import { Button } from "@/components/ui/button";
import {
  useShoppingListItems,
  useAddShoppingListItem,
  useUpdateShoppingListItem,
  useRemoveShoppingListItem,
  useCompleteShoppingList,
} from "@/hooks/useShoppingLists";
import { useApprovedRecommendations } from "@/hooks/useRecommendations";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { toast } from "sonner";
import type { ShoppingListItem } from "@/lib/api-client/models/index";
import { apiClient } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import type { ShoppingList } from "@/lib/api-client/models/index";

export default function ShoppingListDetailPage() {
  const SUGGESTION_CLOSE_DELAY_MS = 150;
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);

  const [isEditMode, setIsEditMode] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: number; name: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: list } = useQuery({
    queryKey: ["shoppingList", listId],
    queryFn: () =>
      apiClient.api.shoppingLists.byId(listId).get() as Promise<ShoppingList>,
    enabled: listId > 0,
  });

  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const addItem = useAddShoppingListItem(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const removeItem = useRemoveShoppingListItem(listId);
  const completeList = useCompleteShoppingList();
  const { data: recommendations } = useApprovedRecommendations();

  const filteredSuggestions = recommendations?.filter(
    (r) =>
      r.name &&
      newItemName.trim().length > 0 &&
      r.name.toLowerCase().includes(newItemName.toLowerCase()) &&
      !items?.some((i) => i.name?.toLowerCase() === r.name?.toLowerCase() && !i.isChecked)
  ) ?? [];

  const uncheckedItems = items?.filter((i) => !i.isChecked) ?? [];
  const showCompleteButton = uncheckedItems.length > 0 && uncheckedItems.length < 3;

  const handleToggleCheck = async (item: ShoppingListItem) => {
    if (isEditMode) return;
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: item.name!,
        isChecked: !item.isChecked,
      });
    } catch {
      toast.error("Failed to update item. Please try again.");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      await addItem.mutateAsync(newItemName);
      setNewItemName("");
      setShowSuggestions(false);
      toast.success("Item added");
    } catch {
      toast.error("Failed to add item. Please try again.");
    }
  };

  const handleSelectSuggestion = async (name: string) => {
    setShowSuggestions(false);
    try {
      await addItem.mutateAsync(name);
      setNewItemName("");
      toast.success("Item added");
    } catch {
      toast.error("Failed to add item. Please try again.");
    }
  };

  const handleSaveEdit = async (item: ShoppingListItem) => {
    if (!editingItem) return;
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: editingItem.name,
        isChecked: item.isChecked ?? false,
      });
      setEditingItem(null);
      toast.success("Item updated");
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

  const handleCompleteList = async () => {
    try {
      const newList = await completeList.mutateAsync(listId);
      toast.success("Shopping complete! A new list has been created.");
      if (newList?.id) {
        router.push(`/shopping-lists/${newList.id}`);
      } else {
        router.push("/shopping-lists");
      }
    } catch {
      toast.error("Failed to complete list. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <button
              onClick={() => router.push("/shopping-lists")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 block"
            >
              &larr; Back to Shopping Lists
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {list?.name ?? "Shopping List"}
            </h2>
          </div>
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsEditMode(!isEditMode);
              setEditingItem(null);
            }}
          >
            {isEditMode ? "Done" : "Edit"}
          </Button>
        </div>

        {showCompleteButton && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between gap-3">
            <p className="text-green-800 dark:text-green-200 font-medium text-sm">
              Almost done! {uncheckedItems.length} item{uncheckedItems.length === 1 ? "" : "s"} remaining.
            </p>
            <Button
              onClick={handleCompleteList}
              disabled={completeList.isPending}
              className="bg-green-600 hover:bg-green-700 text-white shrink-0"
              size="sm"
            >
              {completeList.isPending ? "Completing..." : "Complete"}
            </Button>
          </div>
        )}

        {isEditMode && (
          <form onSubmit={handleAddItem} className="mb-6">
            <div className="relative flex gap-2">
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
                  onBlur={() => setTimeout(() => setShowSuggestions(false), SUGGESTION_CLOSE_DELAY_MS)}
                  placeholder="Add an item..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                  autoComplete="off"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          onMouseDown={() => handleSelectSuggestion(suggestion.name!)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          {suggestion.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button type="submit" disabled={addItem.isPending}>
                {addItem.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Loading...
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
            Failed to load items. Make sure the API is running on port 5238.
          </div>
        )}

        {items && items.length === 0 && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            {isEditMode
              ? "No items yet. Add your first item above!"
              : "No items yet. Switch to Edit mode to add items."}
          </div>
        )}

        {items && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-4 border rounded-md transition-colors ${
                  item.isChecked
                    ? "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.isChecked ?? false}
                  onChange={() => handleToggleCheck(item)}
                  disabled={isEditMode || updateItem.isPending}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />

                {isEditMode && editingItem?.id === item.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={editingItem?.name ?? ""}
                      onChange={(e) =>
                        setEditingItem(editingItem ? { ...editingItem, name: e.target.value } : null)
                      }
                      className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(item);
                        if (e.key === "Escape") setEditingItem(null);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(item)}
                      disabled={updateItem.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingItem(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span
                    role={isEditMode ? "button" : undefined}
                    tabIndex={isEditMode ? 0 : undefined}
                    className={`flex-1 text-gray-900 dark:text-white ${
                      item.isChecked ? "line-through text-gray-400 dark:text-gray-600" : ""
                    } ${isEditMode ? "cursor-pointer hover:text-blue-600" : ""}`}
                    onClick={() => {
                      if (isEditMode) {
                        setEditingItem({ id: item.id!, name: item.name! });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (isEditMode && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setEditingItem({ id: item.id!, name: item.name! });
                      }
                    }}
                  >
                    {item.name}
                  </span>
                )}

                {isEditMode && editingItem?.id !== item.id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id!)}
                    disabled={removeItem.isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {items && items.length > 0 && items.every((i) => i.isChecked) && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between gap-3">
            <p className="text-blue-800 dark:text-blue-200 font-medium text-sm">
              All items checked! Ready to complete the list?
            </p>
            <Button
              onClick={handleCompleteList}
              disabled={completeList.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              size="sm"
            >
              {completeList.isPending ? "Completing..." : "Complete List"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
