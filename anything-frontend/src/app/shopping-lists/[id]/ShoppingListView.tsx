"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import {
  useShoppingListItems,
  useUpdateShoppingListItem,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import type { ShoppingList, ShoppingListItem } from "@/lib/api-client/models/index";

interface Props {
  listId: number;
  list: ShoppingList | undefined;
}

export function ShoppingListView({ listId }: Props) {
  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const updateItem = useUpdateShoppingListItem(listId);

  const uncheckedItems = items?.filter((i) => !i.isChecked) ?? [];
  const checkedItems = items?.filter((i) => i.isChecked) ?? [];
  const sortedItems = [...uncheckedItems, ...checkedItems];

  const handleToggleCheck = async (item: ShoppingListItem) => {
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

  return (
    <>
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
        <ul>
          {sortedItems.map((item) => (
            <Fragment key={item.id}>
              <li
                className={`flex items-center gap-2 py-2 px-3 transition-colors ${
                  item.isChecked ? "bg-gray-50 dark:bg-gray-900/30" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleCheck(item)}
                  disabled={updateItem.isPending}
                  aria-label={item.isChecked ? "Uncheck item" : "Check item"}
                  className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    item.isChecked
                      ? "bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600"
                      : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                  }`}
                >
                  {item.isChecked && <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />}
                </button>

                <span
                  className={`flex-1 text-sm ${
                    item.isChecked
                      ? "line-through text-gray-400 dark:text-gray-600"
                      : "text-gray-900 dark:text-white"
                  }`}
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
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </>
  );
}
