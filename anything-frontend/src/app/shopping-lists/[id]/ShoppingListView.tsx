"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChefHat, List } from "lucide-react";
import {
  useShoppingListItems,
  useUpdateShoppingListItem,
  useCompleteShoppingList,
} from "@/hooks/useShoppingLists";
import { toast } from "sonner";
import { ListItemsStatus } from "@/components/ListItemsStatus";
import { CompleteListDialog } from "@/components/CompleteListDialog";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

type SortMode = "default" | "grouped";

interface ItemGroup {
  label: string | null;
  items: ShoppingListItem[];
}

interface AggregatedItem {
  id: number;
  name: string;
  unit: string | null | undefined;
  amount: number | null | undefined;
  isChecked: boolean;
  underlyingIds: number[];
}

function buildAggregated(items: ShoppingListItem[]): AggregatedItem[] {
  const order: string[] = [];
  const map = new Map<string, ShoppingListItem[]>();

  for (const item of items) {
    const key = `${item.name?.toLowerCase().trim() ?? ""}|${(item.unit ?? "").toLowerCase().trim()}`;
    if (!map.has(key)) {
      order.push(key);
      map.set(key, []);
    }
    map.get(key)!.push(item);
  }

  return order.map((key) => {
    const group = map.get(key)!;
    const first = group[0];
    const totalAmount = group.reduce(
      (sum, i) => (i.amount != null ? sum + i.amount : sum),
      0
    );
    return {
      id: first.id!,
      name: first.name!,
      unit: first.unit,
      amount: totalAmount > 0 ? totalAmount : null,
      isChecked: group.every((i) => !!i.isChecked),
      underlyingIds: group.map((i) => i.id!),
    };
  });
}

function groupItemsByRecipe(items: ShoppingListItem[]): ItemGroup[] {
  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

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
  for (const recipeName of Object.keys(recipeItems).sort()) {
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

function normalizeAmount(amount: number | null | undefined): number | null {
  return amount != null && amount > 0 ? amount : null;
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
  const aggregatedItems = useMemo(
    () => (items ? buildAggregated(items) : []),
    [items]
  );
  const recipeGroups = useMemo(
    () => (items ? groupItemsByRecipe(items) : []),
    [items]
  );

  const handleToggleCheck = async (item: ShoppingListItem) => {
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: item.name!,
        isChecked: !item.isChecked,
        amount: normalizeAmount(item.amount),
        unit: item.unit ?? null,
      });
    } catch {
      toast.error("Failed to update item. Please try again.");
    }
  };

  const handleToggleAggregated = async (agg: AggregatedItem) => {
    const newChecked = !agg.isChecked;
    const underlying = (items ?? []).filter((i) =>
      agg.underlyingIds.includes(i.id!)
    );
    try {
      await Promise.all(
        underlying.map((item) =>
          updateItem.mutateAsync({
            itemId: item.id!,
            name: item.name!,
            isChecked: newChecked,
            amount: normalizeAmount(item.amount),
            unit: item.unit ?? null,
          })
        )
      );
    } catch {
      toast.error("Failed to update item. Please try again.");
    }
  };

  const handleCompleteList = async (markUnchecked: boolean) => {
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
      <CompleteListDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Complete shopping list?"
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

          {sortMode === "default" && (
            <ul>
              {aggregatedItems
                .filter((a) => !a.isChecked)
                .map((agg) => (
                  <li
                    key={agg.id}
                    className="flex items-center gap-2 py-2 px-3 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleAggregated(agg)}
                      disabled={updateItem.isPending || completeList.isPending}
                      aria-label="Check item"
                      className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    />
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">
                      {agg.amount != null && agg.unit && (
                        <span className="text-gray-400 dark:text-gray-500 mr-1">
                          {agg.amount} {agg.unit}
                        </span>
                      )}
                      {agg.amount != null && !agg.unit && (
                        <span className="text-gray-400 dark:text-gray-500 mr-1">
                          {agg.amount}×
                        </span>
                      )}
                      {agg.name}
                    </span>
                  </li>
                ))}
              {aggregatedItems
                .filter((a) => a.isChecked)
                .map((agg) => (
                  <li
                    key={agg.id}
                    className="flex items-center gap-2 py-2 px-3 transition-colors bg-gray-50 dark:bg-gray-900/30"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleAggregated(agg)}
                      disabled={updateItem.isPending || completeList.isPending}
                      aria-label="Uncheck item"
                      className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600"
                    >
                      <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    </button>
                    <span className="flex-1 text-sm line-through text-gray-400 dark:text-gray-600">
                      {agg.amount != null && agg.unit && (
                        <span className="mr-1">
                          {agg.amount} {agg.unit}
                        </span>
                      )}
                      {agg.amount != null && !agg.unit && (
                        <span className="mr-1">{agg.amount}×</span>
                      )}
                      {agg.name}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          {sortMode === "grouped" && (
            <ul>
              {recipeGroups.map((group) => (
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
                        {item.isChecked && (
                          <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        )}
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
                  ))}
                </Fragment>
              ))}
            </ul>
          )}

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
