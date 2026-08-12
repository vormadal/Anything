"use client";

import { ListChecks, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CountBadge } from "@/components/ui/count-badge";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { isShoppingList } from "@/lib/listTypes";
import type { ShoppingListResponse } from "@/lib/api-client/models/index";

const MESSAGE_CLASSES = "py-6 text-center text-sm text-gray-600 dark:text-gray-400";
const ROW_CLASSES =
  "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the chosen list's id and its name, which the embed keeps as its label. */
  onSelect: (listId: number, name: string) => void;
}

/**
 * Picks which of the household's lists to drop into a note. Deliberately only
 * picks — creating a list stays on `/lists`, so this stays one query and one tap.
 */
export function EmbedListDialog({ open, onOpenChange, onSelect }: Props) {
  const { data: lists, isLoading } = useShoppingLists(open);

  const handleSelect = (list: ShoppingListResponse) => {
    onSelect(list.id ?? 0, list.name ?? "");
    onOpenChange(false);
  };

  const renderBody = () => {
    if (isLoading) return <p className={MESSAGE_CLASSES}>Loading…</p>;
    if (!lists || lists.length === 0) return <p className={MESSAGE_CLASSES}>No lists yet.</p>;

    return (
      <ul className="mt-2 max-h-80 overflow-y-auto">
        {lists.map((list) => {
          const shopping = isShoppingList(list.type);
          const ListIcon = shopping ? ShoppingCart : ListChecks;

          return (
            <li key={list.id}>
              <button type="button" className={ROW_CLASSES} onClick={() => handleSelect(list)}>
                <span className="flex items-center gap-2 min-w-0">
                  <ListIcon
                    className={`h-4 w-4 shrink-0 ${shopping ? "text-green-500" : "text-blue-500"}`}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {list.name}
                  </span>
                </span>
                <CountBadge count={list.uncheckedItemCount} />
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert a list</DialogTitle>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}
