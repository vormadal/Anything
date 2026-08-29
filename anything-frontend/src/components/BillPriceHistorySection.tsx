"use client";

import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillEntryForm } from "@/components/BillEntryForm";
import { formatCurrency, formatDate } from "@/lib/billFormat";
import type { BillPriceHistoryResponse } from "@/hooks/useBills";

interface BillPriceHistorySectionProps {
  isOnline: boolean;
  entries?: BillPriceHistoryResponse[];
  isLoading: boolean;
  isAdding: boolean;
  onToggleAdd: () => void;
  amount: string;
  onAmountChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  onDelete: (id: number) => void;
}

function PriceChangeBadge({ current, previous }: { current: number; previous?: number }) {
  // Treat only null/undefined as "missing"; 0 is a valid previous value.
  if (previous == null) return null;

  const diff = current - previous;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="h-3 w-3" />0%
      </span>
    );
  }

  // Avoid division by zero when previous is 0 — show the absolute change instead of a percentage.
  const label =
    previous === 0
      ? formatCurrency(Math.abs(diff))
      : `${Math.abs((diff / previous) * 100).toFixed(1)}%`;

  return diff > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
      <TrendingUp className="h-3 w-3" />+{label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs text-green-500">
      <TrendingDown className="h-3 w-3" />-{label}
    </span>
  );
}

/**
 * The bill detail page's price history — the amount already has one home
 * (the summary card up top, always the latest entry here), so this section
 * is purely the "how it got there" log: every recorded price change, newest
 * first, with the badge showing the jump from whatever preceded it.
 */
export function BillPriceHistorySection({
  isOnline,
  entries,
  isLoading,
  isAdding,
  onToggleAdd,
  amount,
  onAmountChange,
  date,
  onDateChange,
  endDate,
  onEndDateChange,
  notes,
  onNotesChange,
  onSubmit,
  isPending,
  onDelete,
}: Readonly<BillPriceHistorySectionProps>) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">History</h2>
        <Button variant="ghost" size="sm" className="text-xs" onClick={onToggleAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add entry
        </Button>
      </div>

      {isAdding && (
        <BillEntryForm
          onSubmit={onSubmit}
          amount={amount}
          onAmountChange={onAmountChange}
          date={date}
          onDateChange={onDateChange}
          dateAriaLabel="Effective date"
          notes={notes}
          onNotesChange={onNotesChange}
          onCancel={onToggleAdd}
          isPending={isPending}
          isOnline={isOnline}
          offlineTitle="Adding a price entry requires an internet connection"
        >
          <div>
            <label htmlFor="bill-price-end-date" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Valid until (optional)
            </label>
            <input
              id="bill-price-end-date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              min={date}
              className="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </BillEntryForm>
      )}

      {isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      )}

      {!isLoading && (!entries || entries.length === 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No price entries yet.</p>
        </div>
      )}

      {!isLoading && entries && entries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(entry.amount)}
                  </span>
                  <PriceChangeBadge current={entry.amount} previous={entry.previousAmount} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatDate(entry.effectiveDate)}
                  {entry.endDate && ` – ${formatDate(entry.endDate)}`}
                  {entry.notes && <span className="ml-2 text-gray-400 dark:text-gray-500">· {entry.notes}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                disabled={!isOnline}
                title={isOnline ? undefined : "Removing a price entry requires an internet connection"}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                aria-label="Delete price entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
