"use client";

import { Button } from "@/components/ui/button";
import {
  useShoppingListItems,
  useUpdateShoppingListItem,
  useDeleteShoppingList,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import { usePendingItemIds } from "@/lib/offline/outboxStore";
import { useFlipAnimation } from "@/hooks/useFlipAnimation";
import { sortMostRecentlyCheckedFirst } from "@/lib/checklistOrder";
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
  const listRef = useFlipAnimation<HTMLUListElement>();

  const uncheckedItems = items?.filter((i) => !i.isChecked) ?? [];
  // Most-recently-checked first, so undoing a misclick is a tap on the top row.
  const checkedItems = sortMostRecentlyCheckedFirst(items?.filter((i) => i.isChecked) ?? []);

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
  const rowDisabled = updateItem.isPending || deleteList.isPending;

  const renderRow = (item: ShoppingListItem) => (
    <ChecklistItemRow
      key={item.id}
      item={item}
      disabled={rowDisabled}
      pending={pendingItemIds.has(item.id!)}
      onToggle={handleToggleCheck}
    />
  );

  return (
    <>
      <ListItemsStatus
        isLoading={isLoading}
        error={error}
        isEmpty={!!items && items.length === 0}
      />

      {items && items.length > 0 && (
        <ul ref={listRef}>
          {uncheckedItems.map(renderRow)}
          {checkedItems.map(renderRow)}
        </ul>
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
