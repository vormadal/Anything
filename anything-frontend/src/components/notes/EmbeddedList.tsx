"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ListChecks, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import {
  useShoppingList,
  useShoppingListItems,
  useUpdateShoppingListItem,
} from "@/hooks/useShoppingLists";
import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import { usePendingItemIds } from "@/lib/offline/outboxStore";
import { isNetworkError } from "@/lib/offline/networkError";
import { isShoppingList } from "@/lib/listTypes";
import { sortMostRecentlyCheckedFirst } from "@/lib/checklistOrder";
import { useFlipAnimation } from "@/hooks/useFlipAnimation";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

const CARD_CLASSES = "rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden";
const HEADER_CLASSES =
  "flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30";
const MESSAGE_CLASSES = "px-3 py-4 text-center text-sm text-gray-600 dark:text-gray-400";
const REMOVE_CLASSES =
  "shrink-0 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white print:hidden";

function EmbeddedListItems({
  items,
  showQuantity,
  disabled,
  pendingItemIds,
  onToggle,
}: {
  items: ShoppingListItem[];
  showQuantity: boolean;
  disabled: boolean;
  pendingItemIds: Set<number>;
  onToggle?: (item: ShoppingListItem) => void;
}) {
  const listRef = useFlipAnimation<HTMLUListElement>();

  const renderRow = (item: ShoppingListItem) => (
    <ChecklistItemRow
      key={item.id}
      item={item}
      showQuantity={showQuantity}
      disabled={disabled}
      pending={pendingItemIds.has(item.id!)}
      onToggle={onToggle}
    />
  );

  return (
    <ul ref={listRef}>
      {items.filter((i) => !i.isChecked).map(renderRow)}
      {sortMostRecentlyCheckedFirst(items.filter((i) => i.isChecked)).map(renderRow)}
    </ul>
  );
}

interface EmbeddedListCardProps {
  listId: number;
  /**
   * The list's name as it was when the embed was inserted. Shown until the live
   * list loads, and kept as the heading if the list has since been deleted.
   */
  label: string;
  /** False in the read-only note view: the rows render, but nothing can be ticked. */
  interactive: boolean;
  /** Detaches the embed from the note — never deletes the list itself. */
  onRemove?: () => void;
}

/**
 * A list rendered inside a note. Holds no copy of the list: everything comes
 * from the same hooks the `/lists/{id}` page uses, keyed on the same query keys,
 * so an embed shares its cache with that page and inherits SSE live-sync,
 * optimistic updates and the offline outbox without any extra plumbing.
 *
 * Ticking items off is the only mutation offered here; adding, removing,
 * renaming and reordering items stay on the list's own page.
 *
 * Kept free of Tiptap types so it can be unit-tested without an editor —
 * `EmbeddedListNodeView` below is the thin adapter that supplies its props.
 */
export function EmbeddedListCard({ listId, label, interactive, onRemove }: EmbeddedListCardProps) {
  const { data: list } = useShoppingList(listId);
  const { data: items, fetchStatus, error } = useShoppingListItems(listId);
  const updateItem = useUpdateShoppingListItem(listId);
  const pendingItemIds = usePendingItemIds(listId);

  const shopping = isShoppingList(list?.type);
  const ListIcon = shopping ? ShoppingCart : ListChecks;

  const handleToggle = async (item: ShoppingListItem) => {
    try {
      await updateItem.mutateAsync({
        itemId: item.id!,
        name: item.name!,
        isChecked: !item.isChecked,
        // The endpoint takes a whole item, not a patch: leaving these out would
        // silently clear a shopping item's quantity on every tick.
        amount: item.amount ?? null,
        unit: item.unit ?? null,
      });
    } catch {
      toast.error("Failed to update item. Please try again.");
    }
  };

  const renderBody = () => {
    // Items first: a cached list still renders while a background refetch fails.
    if (items) {
      if (items.length === 0) return <p className={MESSAGE_CLASSES}>No items yet.</p>;

      return (
        <EmbeddedListItems
          items={items}
          showQuantity={shopping}
          disabled={updateItem.isPending}
          pendingItemIds={pendingItemIds}
          onToggle={interactive ? handleToggle : undefined}
        />
      );
    }
    // Queries (unlike this app's mutations) keep React Query's default "online"
    // network mode, but its onlineManager only flips on the browser's
    // online/offline events — so offline a first load usually fails outright
    // rather than pausing. Both mean "no connection", not "no list".
    if (isNetworkError(error) || fetchStatus === "paused") {
      return <p className={MESSAGE_CLASSES}>This list isn&apos;t available offline.</p>;
    }
    // A list is soft-deleted, so an embed can outlive the list it points at.
    if (error) return <p className={MESSAGE_CLASSES}>This list is no longer available.</p>;

    return <p className={MESSAGE_CLASSES}>Loading…</p>;
  };

  return (
    <div className={CARD_CLASSES}>
      <div className={HEADER_CLASSES}>
        <ListIcon
          className={`h-4 w-4 shrink-0 ${shopping ? "text-green-500" : "text-blue-500"}`}
          aria-hidden="true"
        />
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
          {list?.name ?? label}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove list from note"
            title="Remove list from note"
            className={REMOVE_CLASSES}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {renderBody()}
    </div>
  );
}

/**
 * The `listEmbed` node's React node view. Mounted by both the editor and the
 * read-only renderer, since they share one extension list — `editor.isEditable`
 * is what separates the two.
 */
export function EmbeddedListNodeView({ node, editor, deleteNode }: NodeViewProps) {
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper
      data-list-embed=""
      // The card is UI, not prose: without this ProseMirror would treat clicks
      // inside it as caret placement and let the user type into the markup.
      contentEditable={false}
      onMouseDown={(event: React.MouseEvent) => event.stopPropagation()}
    >
      <EmbeddedListCard
        listId={Number(node.attrs.listId ?? 0)}
        label={typeof node.attrs.label === "string" ? node.attrs.label : ""}
        interactive={editable}
        onRemove={editable ? deleteNode : undefined}
      />
    </NodeViewWrapper>
  );
}
