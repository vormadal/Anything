"use client";

import { Pencil } from "lucide-react";
import type { ItemSuggestionResponse, ShoppingListItem } from "@/lib/api-client/models/index";

export const ITEM_SUGGESTIONS_LISTBOX_ID = "item-suggestions";

/** "2 L", "6×", "kg" or "" — the same shorthand the item rows use. */
export function formatQuantity(amount?: number | null, unit?: string | null): string {
  if (amount != null && unit) return `${amount} ${unit}`;
  if (amount != null) return `${amount}×`;
  return unit ?? "";
}

export function suggestionOptionId(index: number): string {
  return `${ITEM_SUGGESTIONS_LISTBOX_ID}-${index}`;
}

interface Props {
  suggestions: ItemSuggestionResponse[];
  activeIndex: number;
  /** An item already on the list whose name exactly matches what was typed. */
  existingMatch?: ShoppingListItem;
  onAdd: (suggestion: ItemSuggestionResponse) => void;
  onFill: (suggestion: ItemSuggestionResponse) => void;
  onEditExisting: (item: ShoppingListItem) => void;
}

/**
 * The add box's dropdown. Tapping a row adds the item straight away with its
 * suggested quantity; the pencil fills the form instead so it can be adjusted
 * first. Every control acts on `mousedown` with `preventDefault`, so the name
 * input keeps focus — after a one-tap add the dropdown stays open on the
 * list's usuals, ready for the next one.
 */
export function ItemSuggestions({
  suggestions,
  activeIndex,
  existingMatch,
  onAdd,
  onFill,
  onEditExisting,
}: Readonly<Props>) {
  const existingQuantity = existingMatch
    ? formatQuantity(existingMatch.amount, existingMatch.unit)
    : "";

  return (
    <ul
      id={ITEM_SUGGESTIONS_LISTBOX_ID}
      role="listbox"
      aria-label="Item suggestions"
      className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto"
    >
      {existingMatch && (
        <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-600">
          <span>
            Already on the list{existingQuantity && ` (${existingQuantity})`}
          </span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onEditExisting(existingMatch);
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </button>
        </li>
      )}
      {suggestions.map((suggestion, index) => {
        const quantity = formatQuantity(suggestion.suggestedAmount, suggestion.suggestedUnit);
        const active = index === activeIndex;
        return (
          <li
            key={suggestion.recommendationId}
            id={suggestionOptionId(index)}
            role="option"
            aria-selected={active}
            className={`flex items-center ${active ? "bg-blue-50 dark:bg-gray-600" : ""}`}
          >
            <button
              type="button"
              aria-label={`Add ${suggestion.name}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onAdd(suggestion);
              }}
              className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
            >
              <span className="truncate">{suggestion.name}</span>
              {quantity && (
                <span className="shrink-0 text-gray-400 dark:text-gray-400">{quantity}</span>
              )}
            </button>
            <button
              type="button"
              aria-label={`Adjust ${suggestion.name} before adding`}
              onMouseDown={(e) => {
                e.preventDefault();
                onFill(suggestion);
              }}
              className="shrink-0 px-3 py-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
