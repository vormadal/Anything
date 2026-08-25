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
  hasVariableAmount: boolean;
  onHasVariableAmountChange: (value: boolean) => void;
}

/**
 * Recurring/One-time + Payment toggles, plus the Frequency and "amount varies
 * each period" fields shown only while recurring. Shared by the new-bill and
 * edit-bill forms so the two never drift out of sync with each other or with
 * the backend's recurrence invariant (non-recurring => Frequency: None,
 * HasVariableAmount: false).
 */
export function BillRecurrenceFields({
  idPrefix,
  isRecurring,
  onIsRecurringChange,
  isAutomated,
  onIsAutomatedChange,
  frequency,
  onFrequencyChange,
  hasVariableAmount,
  onHasVariableAmountChange,
}: Readonly<BillRecurrenceFieldsProps>) {
  return (
    <>
      {/* Recurring + Automated */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Recurs
          </p>
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

      {/* Frequency + Variable amount (only meaningful for recurring bills) */}
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
          <div className="flex items-end pb-2">
            <label htmlFor={`${idPrefix}-variable-amount`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                id={`${idPrefix}-variable-amount`}
                type="checkbox"
                checked={hasVariableAmount}
                onChange={(e) => onHasVariableAmountChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              Amount varies each period
            </label>
          </div>
        </div>
      )}
    </>
  );
}
