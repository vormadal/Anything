"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface BillEntryFormProps {
  onSubmit: (e: React.FormEvent) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  dateAriaLabel: string;
  notes: string;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  isPending: boolean;
  isOnline: boolean;
  offlineTitle: string;
  /** Extra field(s) rendered between the amount/date row and notes — e.g. an optional end date. */
  children?: ReactNode;
}

/**
 * Inline "quick add" form used by the bill detail page's price-history
 * section: amount + date, optional extra fields (e.g. an end date), notes,
 * then Cancel/Save. Split out on its own (rather than inlined into
 * BillPriceHistorySection) so a second amount-tied-to-a-date entry point
 * doesn't have to duplicate this shape if one is ever added.
 */
export function BillEntryForm({
  onSubmit,
  amount,
  onAmountChange,
  date,
  onDateChange,
  dateAriaLabel,
  notes,
  onNotesChange,
  onCancel,
  isPending,
  isOnline,
  offlineTitle,
  children,
}: Readonly<BillEntryFormProps>) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3 space-y-2"
    >
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="Amount"
          min="0.01"
          step="0.01"
          required
          className="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
          aria-label={dateAriaLabel}
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {children}
      <input
        type="text"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={isPending || !isOnline}
          title={isOnline ? undefined : offlineTitle}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
