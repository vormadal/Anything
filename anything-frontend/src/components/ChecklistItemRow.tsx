"use client";

import { Check, Clock } from "lucide-react";
import type { ShoppingListItem } from "@/lib/api-client/models/index";

const ROW_BASE = "flex items-center gap-2 py-2 px-3 transition-colors";
const ROW_CHECKED = `${ROW_BASE} bg-gray-50 dark:bg-gray-900/30`;
const BOX_BASE =
  "shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";
const BOX_CHECKED = `${BOX_BASE} bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600`;
const BOX_UNCHECKED = `${BOX_BASE} border-gray-300 dark:border-gray-600 hover:border-blue-400`;
const TEXT_CHECKED = "flex-1 text-sm line-through text-gray-400 dark:text-gray-600";
const TEXT_UNCHECKED = "flex-1 text-sm text-gray-900 dark:text-white";
const CHECK_ICON = "h-3 w-3 text-gray-500 dark:text-gray-400";
const CLOCK_BASE = "inline-block h-3 w-3 ml-1.5 mb-0.5";
const MUTED = "text-gray-400 dark:text-gray-500";
const SPACED = "mr-1";

/**
 * The `{amount} {unit}` (or `{amount}×`) prefix a shopping-list item carries in
 * front of its name. Checked rows are already muted and struck through by the
 * row's own text colour, so the prefix only dims itself while unchecked.
 */
function QuantityPrefix({ item, checked }: { item: ShoppingListItem; checked: boolean }) {
  if (item.amount == null) return null;

  return (
    <span className={checked ? SPACED : `${MUTED} ${SPACED}`}>
      {item.unit ? `${item.amount} ${item.unit}` : `${item.amount}×`}
    </span>
  );
}

interface ChecklistItemRowProps {
  item: ShoppingListItem;
  /** Show the amount/unit prefix. Off for General checklists, which never have one. */
  showQuantity?: boolean;
  disabled?: boolean;
  /** Whether this item is still queued in the offline outbox. */
  pending?: boolean;
  /** Omit on read-only surfaces — the checkbox then renders disabled. */
  onToggle?: (item: ShoppingListItem) => void;
}

/**
 * One checkable row of a list, as an `<li>` — the caller supplies the `<ul>`.
 *
 * Shared by the `/lists/{id}` checklist view and the note embed so the two
 * always look the same. There is no `Checkbox` primitive in `components/ui`;
 * the box is a plain button styled to look like one.
 */
export function ChecklistItemRow({
  item,
  showQuantity = false,
  disabled = false,
  pending = false,
  onToggle,
}: ChecklistItemRowProps) {
  const checked = !!item.isChecked;

  return (
    <li className={checked ? ROW_CHECKED : ROW_BASE}>
      <button
        type="button"
        onClick={onToggle ? () => onToggle(item) : undefined}
        disabled={disabled || !onToggle}
        aria-label={checked ? "Uncheck item" : "Check item"}
        className={checked ? BOX_CHECKED : BOX_UNCHECKED}
      >
        {checked && <Check className={CHECK_ICON} />}
      </button>
      <span className={checked ? TEXT_CHECKED : TEXT_UNCHECKED}>
        {showQuantity && <QuantityPrefix item={item} checked={checked} />}
        {item.name}
        {pending && (
          <Clock className={checked ? CLOCK_BASE : `${CLOCK_BASE} ${MUTED}`} aria-label="Pending sync" />
        )}
      </span>
    </li>
  );
}
