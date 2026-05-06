"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import {
  useShoppingListItems,
  useUpdateShoppingListItem,
  useCompleteShoppingList,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import { CompleteListDialog } from "@/components/CompleteListDialog";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

interface Props {
  listId: number;
}

export function GeneralChecklistView({ listId }: Props) {
  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const completeList = useCompleteShoppingList();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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

  const handleCompleteList = async (markUnchecked: boolean) => {
    try {
      await completeList.mutateAsync({ id: listId, markUnchecked });
      toast.success("List completed!");
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
      <CompleteListDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Complete list?"
        uncheckedCount={uncheckedItems.length}
        isPending={completeList.isPending}
        onKeep={() => { setConfirmDialogOpen(false); handleCompleteList(false); }}
        onComplete={() => { setConfirmDialogOpen(false); handleCompleteList(true); }}
      />

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
                  disabled={updateItem.isPending || completeList.isPending}
                  aria-label="Check item"
                  className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 hover:border-blue-400"
                />
                <span className="flex-1 text-sm text-gray-900 dark:text-white">
                  {item.name}
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
                  disabled={updateItem.isPending || completeList.isPending}
                  aria-label="Uncheck item"
                  className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600"
                >
                  <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                </button>
                <span className="flex-1 text-sm line-through text-gray-400 dark:text-gray-600">
                  {item.name}
                </span>
              </li>
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
