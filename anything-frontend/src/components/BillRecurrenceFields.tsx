"use client";

import { PAYMENT_FREQUENCIES, FREQUENCY_LABELS } from "@/hooks/useBills";

interface BillRecurrenceFieldsProps {
  /** Prefix for element ids (e.g. "bill" or "edit-bill") to keep ids unique per form. */
  idPrefix: string;
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  isAutomated: boolean;
  onIsAutomatedChange: (value: boolean) => void;
  frequency: string;
  onFrequencyChange: (value: string) => void;
  /**
   * The bill's initial Amount + Date, shown directly under the Recurring/
   * One-time toggle regardless of which is selected. Omit both to leave that
   * row out entirely — the edit form has no initial-amount concept to bind
   * (price changes go through the price-history section on the detail page
   * instead), so it only passes these on the create form.
   */
  amount?: string;
  onAmountChange?: (value: string) => void;
  date?: string;
  onDateChange?: (value: string) => void;
}

/**
 * Recurring/One-time toggle, the optional Amount + Date row beneath it, and
 * — only while recurring — Frequency + Payment. Shared by the new-bill and
 * edit-bill forms so the two never drift out of sync with each other or with
 * the backend's recurrence invariant (non-recurring => Frequency: None).
 */
export function BillRecurrenceFields({
  idPrefix,
  isRecurring,
  onIsRecurringChange,
  isAutomated,
  onIsAutomatedChange,
  frequency,
  onFrequencyChange,
  amount,
  onAmountChange,
  date,
  onDateChange,
}: Readonly<BillRecurrenceFieldsProps>) {
  return (
    <>
      {/* Recurring/One-time — alone on its own row; nothing about Payment or
          a date depends on which is picked until the rows below react to it. */}
      <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        <button
          type="button"
          onClick={() => onIsRecurringChange(true)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            isRecurring
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          Recurring
        </button>
        <button
          type="button"
          onClick={() => onIsRecurringChange(false)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            !isRecurring
              ? "bg-gray-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          One-time
        </button>
      </div>

      {/* Amount + Date — same pair, same position, whether recurring or one-time */}
      {onAmountChange && onDateChange && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${idPrefix}-amount`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount
            </label>
            <input
              id={`${idPrefix}-amount`}
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-date`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <input
              id={`${idPrefix}-date`}
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Frequency + Payment — only meaningful for recurring bills */}
      {isRecurring && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${idPrefix}-frequency`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select
              id={`${idPrefix}-frequency`}
              value={frequency}
              onChange={(e) => onFrequencyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_FREQUENCIES.filter((f) => f !== "None").map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment
            </p>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                type="button"
                onClick={() => onIsAutomatedChange(true)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  isAutomated
                    ? "bg-green-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => onIsAutomatedChange(false)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  !isAutomated
                    ? "bg-orange-500 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
