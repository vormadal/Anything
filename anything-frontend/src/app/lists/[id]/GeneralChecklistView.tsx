"use client";

import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import {
  useShoppingListItems,
  useUpdateShoppingListItem,
  useDeleteShoppingList,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import { usePendingItemIds } from "@/lib/offline/outboxStore";
import type { ShoppingListItem } from "@/lib/api-client/models/index";
import { useRouter } from "next/navigation";

interface Props {
  listId: number;
}

export function GeneralChecklistView({ listId }: Props) {
  const router = useRouter();
  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const deleteList = useDeleteShoppingList();
  const pendingItemIds = usePendingItemIds(listId);

  const uncheckedItems = items?.filter((i) => !i.isChecked) ?? [];
  const checkedItems = items?.filter((i) => i.isChecked) ?? [];

  const handleToggleCheck = async (item: ShoppingListItem) => {
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: item.name!,
        isChecked: !item.isChecked,
        amount: null,
        unit: null,
      });
    } catch {
      toast.error("Failed to update item. Please try again.");
    }
  };

  const handleCloseList = async () => {
    try {
      await deleteList.mutateAsync(listId);
      toast.success("List closed");
      router.push("/lists");
    } catch {
      toast.error("Failed to close list. Please try again.");
    }
  };

  const canCloseList = !!items && items.length > 0 && uncheckedItems.length === 0;

  return (
    <>
      <ListItemsStatus
        isLoading={isLoading}
        error={error}
        isEmpty={!!items && items.length === 0}
      />

      {items && items.length > 0 && (
        <>
          <ul>
            {uncheckedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 py-2 px-3 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleToggleCheck(item)}
                  disabled={updateItem.isPending || deleteList.isPending}
                  aria-label="Check item"
                  className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 hover:border-blue-400"
                />
                <span className="flex-1 text-sm text-gray-900 dark:text-white">
                  {item.name}
                  {pendingItemIds.has(item.id!) && (
                    <Clock
                      className="inline-block h-3 w-3 ml-1.5 mb-0.5 text-gray-400 dark:text-gray-500"
                      aria-label="Pending sync"
                    />
                  )}
                </span>
              </li>
            ))}
            {checkedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 py-2 px-3 transition-colors bg-gray-50 dark:bg-gray-900/30"
              >
                <button
                  type="button"
                  onClick={() => handleToggleCheck(item)}
                  disabled={updateItem.isPending || deleteList.isPending}
                  aria-label="Uncheck item"
                  className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600"
                >
                  <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                </button>
                <span className="flex-1 text-sm line-through text-gray-400 dark:text-gray-600">
                  {item.name}
                  {pendingItemIds.has(item.id!) && (
                    <Clock className="inline-block h-3 w-3 ml-1.5 mb-0.5" aria-label="Pending sync" />
                  )}
                </span>
              </li>
            ))}
          </ul>

        </>
      )}

      {canCloseList && (
        <Button
          onClick={handleCloseList}
          disabled={deleteList.isPending}
          className="fixed bottom-6 right-6 z-30 shadow-lg"
        >
          {deleteList.isPending ? "Closing..." : "Close List"}
        </Button>
      )}
    </>
  );
}
