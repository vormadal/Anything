"use client";

import { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillEntryForm } from "@/components/BillEntryForm";
import { formatCurrency, formatDate } from "@/lib/billFormat";
import type { BillPriceHistoryResponse, BillAmountEntryResponse } from "@/hooks/useBills";

interface PriceHistorySectionProps {
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

interface AmountEntriesSectionProps {
  entries?: BillAmountEntryResponse[];
  isLoading: boolean;
  isAdding: boolean;
  onToggleAdd: () => void;
  amount: string;
  onAmountChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

interface BillHistorySectionProps {
  hasVariableAmount: boolean;
  isOnline: boolean;
  priceHistory: PriceHistorySectionProps;
  amountEntries: AmountEntriesSectionProps;
}

type HistoryTab = "amount" | "price";

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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}

function PriceHistoryList({
  entries,
  onDelete,
  isOnline,
}: {
  entries: BillPriceHistoryResponse[];
  onDelete: (id: number) => void;
  isOnline: boolean;
}) {
  return (
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
  );
}

function AmountEntriesList({ entries }: { entries: BillAmountEntryResponse[] }) {
  const average = entries.reduce((sum, e) => sum + e.amount, 0) / entries.length;

  return (
    <>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Average {formatCurrency(average)} over {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </p>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatCurrency(entry.amount)}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDate(entry.periodDate)}
              {entry.notes && <span className="ml-2 text-gray-400 dark:text-gray-500">· {entry.notes}</span>}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * The bill detail page's single "History" section: a bill's current amount
 * already has one home (the summary card up top), so price history and
 * amount entries — both historic breakdowns of it — share this one section
 * behind a tab switch instead of stacking as two separate always-visible
 * lists. A bill with HasVariableAmount=false has nothing to switch between
 * (amount entries only make sense for variable-amount bills — see
 * CLAUDE.md's Bills endpoints notes) so the tabs themselves only render
 * when there's a real choice to make.
 */
export function BillHistorySection({
  hasVariableAmount,
  isOnline,
  priceHistory,
  amountEntries,
}: Readonly<BillHistorySectionProps>) {
  const [tab, setTab] = useState<HistoryTab>(hasVariableAmount ? "amount" : "price");
  const activeTab = hasVariableAmount ? tab : "price";

  const active = activeTab === "price" ? priceHistory : amountEntries;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        {hasVariableAmount ? (
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab("amount")}
              className={`px-3 py-1.5 transition-colors ${
                activeTab === "amount"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              Amount entries
            </button>
            <button
              type="button"
              onClick={() => setTab("price")}
              className={`px-3 py-1.5 transition-colors ${
                activeTab === "price"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              Price history
            </button>
          </div>
        ) : (
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">History</h2>
        )}
        <Button variant="ghost" size="sm" className="text-xs" onClick={active.onToggleAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add entry
        </Button>
      </div>

      {activeTab === "price" && priceHistory.isAdding && (
        <BillEntryForm
          onSubmit={priceHistory.onSubmit}
          amount={priceHistory.amount}
          onAmountChange={priceHistory.onAmountChange}
          date={priceHistory.date}
          onDateChange={priceHistory.onDateChange}
          dateAriaLabel="Effective date"
          notes={priceHistory.notes}
          onNotesChange={priceHistory.onNotesChange}
          onCancel={priceHistory.onToggleAdd}
          isPending={priceHistory.isPending}
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
              value={priceHistory.endDate}
              onChange={(e) => priceHistory.onEndDateChange(e.target.value)}
              min={priceHistory.date}
              className="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </BillEntryForm>
      )}

      {activeTab === "amount" && amountEntries.isAdding && (
        <BillEntryForm
          onSubmit={amountEntries.onSubmit}
          amount={amountEntries.amount}
          onAmountChange={amountEntries.onAmountChange}
          date={amountEntries.date}
          onDateChange={amountEntries.onDateChange}
          dateAriaLabel="Period date"
          notes={amountEntries.notes}
          onNotesChange={amountEntries.onNotesChange}
          onCancel={amountEntries.onToggleAdd}
          isPending={amountEntries.isPending}
          isOnline={isOnline}
          offlineTitle="Adding an amount entry requires an internet connection"
        />
      )}

      {active.isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</div>
      )}

      {activeTab === "price" &&
        !priceHistory.isLoading &&
        (!priceHistory.entries || priceHistory.entries.length === 0) && (
          <EmptyState text="No price entries yet." />
        )}
      {activeTab === "price" && !priceHistory.isLoading && priceHistory.entries && priceHistory.entries.length > 0 && (
        <PriceHistoryList entries={priceHistory.entries} onDelete={priceHistory.onDelete} isOnline={isOnline} />
      )}

      {activeTab === "amount" &&
        !amountEntries.isLoading &&
        (!amountEntries.entries || amountEntries.entries.length === 0) && (
          <EmptyState text="No amount entries yet." />
        )}
      {activeTab === "amount" &&
        !amountEntries.isLoading &&
        amountEntries.entries &&
        amountEntries.entries.length > 0 && <AmountEntriesList entries={amountEntries.entries} />}
    </div>
  );
}
