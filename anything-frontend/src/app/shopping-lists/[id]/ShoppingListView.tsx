"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
import {
  useShoppingListItems,
  useUpdateShoppingListItem,
  useCompleteShoppingList,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

interface Props {
  listId: number;
}

export function ShoppingListView({ listId }: Props) {
  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const completeList = useCompleteShoppingList();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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

  const handleCompleteList = async (markUnchecked: boolean) => {
    setConfirmDialogOpen(false);
    try {
      await completeList.mutateAsync({ id: listId, markUnchecked });
      toast.success("Shopping list completed!");
    } catch {
      toast.error("Failed to complete list. Please try again.");
    }
  };

  const handleCompleteClick = () => {
    if (uncheckedItems.length > 0) {
      setConfirmDialogOpen(true);
    } else {
      handleCompleteList(false);
    }
  };

  return (
    <>
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete shopping list?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            There {uncheckedItems.length === 1 ? "is" : "are"} {uncheckedItems.length} unchecked{" "}
            {uncheckedItems.length === 1 ? "item" : "items"} remaining. Would you like to mark{" "}
            {uncheckedItems.length === 1 ? "it" : "them"} as complete too?
          </p>
          <DialogFooter className="flex gap-2 sm:flex-row flex-col">
            <Button
              variant="outline"
              onClick={() => handleCompleteList(false)}
              disabled={completeList.isPending}
            >
              No, keep them
            </Button>
            <Button
              onClick={() => handleCompleteList(true)}
              disabled={completeList.isPending}
            >
              Yes, mark all complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <>
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
                    disabled={updateItem.isPending || completeList.isPending}
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

          <div className="flex justify-end py-2">
              <Button
                onClick={handleCompleteClick}
                disabled={completeList.isPending}
                size="sm"
              >
                {completeList.isPending ? "Completing..." : "Complete List"}
              </Button>
            </div>
        </>
      )}
    </>
  );
}
