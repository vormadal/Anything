"use client";

import { PAYMENT_FREQUENCIES, FREQUENCY_LABELS } from "@/hooks/useBills";
import { Switch } from "@/components/ui/switch";

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
  /**
   * Date shown in place of the Payment toggle while one-time (Payment/Auto-
   * Manual has no meaning for a bill that isn't recurring). Omit to leave
   * that slot empty instead — e.g. the edit form has no date field to bind.
   */
  oneTimeDate?: string;
  onOneTimeDateChange?: (value: string) => void;
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
  oneTimeDate,
  onOneTimeDateChange,
}: Readonly<BillRecurrenceFieldsProps>) {
  return (
    <>
      {/* Recurring + Automated (or a Date, while one-time) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
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
        {isRecurring ? (
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
        ) : (
          onOneTimeDateChange && (
            <div>
              <label htmlFor={`${idPrefix}-one-time-date`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                id={`${idPrefix}-one-time-date`}
                type="date"
                value={oneTimeDate}
                onChange={(e) => onOneTimeDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )
        )}
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
            <div className="flex items-center gap-2">
              <Switch
                id={`${idPrefix}-variable-amount`}
                checked={hasVariableAmount}
                onCheckedChange={onHasVariableAmountChange}
              />
              <label htmlFor={`${idPrefix}-variable-amount`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Amount varies
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
