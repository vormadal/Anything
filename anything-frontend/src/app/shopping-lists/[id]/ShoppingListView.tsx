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
import { Check, ChefHat, List } from "lucide-react";
import {
  useShoppingListItems,
  useUpdateShoppingListItem,
  useCompleteShoppingList,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

type SortMode = "default" | "grouped";

interface ItemGroup {
  label: string | null;
  items: ShoppingListItem[];
}

function groupItems(items: ShoppingListItem[], mode: SortMode): ItemGroup[] {
  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

  if (mode === "default") {
    return [{ label: null, items: [...unchecked, ...checked] }];
  }

  // Grouped mode: group unchecked by recipe source, then checked items
  const recipeItems: Record<string, ShoppingListItem[]> = {};
  const directItems: ShoppingListItem[] = [];

  for (const item of unchecked) {
    if (item.addedByRecipe) {
      if (!recipeItems[item.addedByRecipe]) {
        recipeItems[item.addedByRecipe] = [];
      }
      recipeItems[item.addedByRecipe].push(item);
    } else {
      directItems.push(item);
    }
  }

  const groups: ItemGroup[] = [];
  const sortedRecipeNames = Object.keys(recipeItems).sort();
  for (const recipeName of sortedRecipeNames) {
    groups.push({ label: recipeName, items: recipeItems[recipeName] });
  }

  if (directItems.length > 0) {
    groups.push({ label: "Added directly", items: directItems });
  }

  if (checked.length > 0) {
    groups.push({ label: null, items: checked });
  }

  return groups;
}

interface Props {
  listId: number;
}

export function ShoppingListView({ listId }: Props) {
  const { data: items, isLoading, error } = useShoppingListItems(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const completeList = useCompleteShoppingList();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const uncheckedItems = items?.filter((i) => !i.isChecked) ?? [];
  const groups = items ? groupItems(items, sortMode) : [];

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
          Failed to load items. Please try again later.
        </div>
      )}

      {items && items.length === 0 && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No items yet.
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div className="flex justify-end mb-2">
            <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setSortMode("default")}
                aria-label="Default order"
                aria-pressed={sortMode === "default"}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                  sortMode === "default"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Default
              </button>
              <button
                type="button"
                onClick={() => setSortMode("grouped")}
                aria-label="Group by recipe"
                aria-pressed={sortMode === "grouped"}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs border-l border-gray-200 dark:border-gray-700 transition-colors ${
                  sortMode === "grouped"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <ChefHat className="h-3.5 w-3.5" />
                By recipe
              </button>
            </div>
          </div>

          <ul>
            {groups.map((group) => (
              <Fragment key={group.label ?? "__checked__"}>
                {group.label !== null && (
                  <li className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                    <ChefHat className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      {group.label}
                    </span>
                  </li>
                )}
                {group.items.map((item) => (
                  <li
                    key={item.id}
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

                    {sortMode === "default" && item.addedByRecipe && !item.isChecked && (
                      <span className="shrink-0 flex items-center gap-0.5 text-xs text-blue-500 dark:text-blue-400">
                        <ChefHat className="h-3 w-3" />
                        {item.addedByRecipe}
                      </span>
                    )}
                  </li>
                ))}
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
