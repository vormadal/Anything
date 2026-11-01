"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIELD_INPUT_CLASS, FIELD_LABEL_CLASS } from "@/components/inventory/inventoryFormStyles";
import { formatKr, formatQty, round2, type ToBuyGroup, type ToBuyLine } from "@/lib/renovation";
import type { RenovationPurchaseInput } from "@/hooks/useRenovation";
import type { Vendor } from "@/hooks/useVendors";
import { parseDecimal } from "@/components/renovation/materials/materialsView";
import { parseQuantity, previewSplit, todayIso } from "./shoppingView";

const OTHER_VENDOR = "other";
const NO_VENDOR = "";
const OVER_CLASS = "text-orange-700 dark:text-orange-400";
const UNDER_CLASS = "text-blue-700 dark:text-blue-400";
const MUTED_CLASS = "text-gray-500 dark:text-gray-400";

interface RecordPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selected groups; every line in them gets a row. */
  groups: readonly ToBuyGroup[];
  vendors: readonly Vendor[];
  isPending: boolean;
  onSubmit: (input: RenovationPurchaseInput) => Promise<void>;
}

export function RecordPurchaseDialog(props: RecordPurchaseDialogProps) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The form mounts only while open, so each recording starts from a clean slate. */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record purchase</DialogTitle>
        </DialogHeader>
        <RecordPurchaseForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

interface FormErrors {
  purchasedOn?: string;
  total?: string;
  quantities: Record<number, string>;
}

interface LineRowProps {
  line: ToBuyLine;
  unit: string;
  quantityText: string;
  done: boolean;
  amount: string;
  error?: string;
  onQuantity: (text: string) => void;
  onDone: (done: boolean) => void;
}

function coverageNote(line: ToBuyLine, unit: string, quantityText: string): { text: string; className: string } {
  const quantity = parseQuantity(quantityText);
  if (!Number.isFinite(quantity) || quantity <= 0) return { text: "", className: MUTED_CLASS };
  const remaining = line.remainingQuantity;
  if (quantity < remaining - 0.005) {
    return {
      text: `Partial · ${formatQty(round2(remaining - quantity), unit)} still to buy`,
      className: OVER_CLASS,
    };
  }
  return { text: "Covers what is still to buy", className: MUTED_CLASS };
}

function LineRow({ line, unit, quantityText, done, amount, error, onQuantity, onDone }: LineRowProps) {
  const note = coverageNote(line, unit, quantityText);
  return (
    <li className="flex flex-col gap-2 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-700">
      <div className="flex items-start gap-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{line.label}</span>
          <span className={`text-xs ${MUTED_CLASS}`}>{line.roomName}</span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              aria-label={`Quantity bought for ${line.label} in ${line.roomName}`}
              value={quantityText}
              onChange={(event) => onQuantity(event.target.value)}
              aria-invalid={error ? true : undefined}
              className="h-11 w-20 rounded-md border border-gray-300 bg-white px-2 text-right text-sm dark:border-gray-600 dark:bg-gray-800"
            />
            <span className={`text-xs ${MUTED_CLASS}`}>{unit}</span>
          </span>
        </span>
        <span className="w-20 shrink-0 text-right text-sm font-semibold text-gray-900 dark:text-white">
          {amount}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs font-medium ${note.className}`}>{note.text}</span>
        <label className="flex min-h-11 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={done}
            onChange={(event) => onDone(event.target.checked)}
            className="h-5 w-5 accent-gray-900 dark:accent-white"
          />
          Done even if less
        </label>
      </div>
    </li>
  );
}

function VendorField({
  vendors,
  choice,
  otherName,
  onChoice,
  onOtherName,
}: {
  vendors: readonly Vendor[];
  choice: string;
  otherName: string;
  onChoice: (choice: string) => void;
  onOtherName: (name: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-vendor`} className={FIELD_LABEL_CLASS}>
        Vendor
      </label>
      <select
        id={`${id}-vendor`}
        value={choice}
        onChange={(event) => onChoice(event.target.value)}
        className={`${FIELD_INPUT_CLASS} h-11`}
      >
        <option value={NO_VENDOR}>No vendor</option>
        {vendors.map((vendor) => (
          <option key={vendor.id} value={String(vendor.id)}>
            {vendor.name}
          </option>
        ))}
        <option value={OTHER_VENDOR}>Other…</option>
      </select>
      {choice === OTHER_VENDOR && (
        <input
          type="text"
          aria-label="Vendor name"
          placeholder="Vendor name"
          value={otherName}
          onChange={(event) => onOtherName(event.target.value)}
          className={`${FIELD_INPUT_CLASS} h-11`}
        />
      )}
    </div>
  );
}

function diffText(total: number, estimate: number): { text: string; className: string } {
  const diff = round2(total - estimate);
  if (diff === 0) return { text: `On estimate of ${formatKr(estimate)}`, className: MUTED_CLASS };
  const sign = diff > 0 ? "+" : "−";
  return {
    text: `${sign}${formatKr(Math.abs(diff))} vs estimate of ${formatKr(estimate)}`,
    className: diff > 0 ? OVER_CLASS : UNDER_CLASS,
  };
}

function RecordPurchaseForm({ groups, vendors, isPending, onSubmit, onOpenChange }: RecordPurchaseDialogProps) {
  const idPrefix = useId();
  const lines = groups.flatMap((group) => group.lines.map((line) => ({ line, unit: group.unit })));

  const [purchasedOn, setPurchasedOn] = useState(todayIso);
  const [vendorChoice, setVendorChoice] = useState(NO_VENDOR);
  const [otherVendor, setOtherVendor] = useState("");
  const [total, setTotal] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({ quantities: {} });

  const quantityOf = (line: ToBuyLine) => quantities[line.lineId] ?? String(line.remainingQuantity);
  const rows = lines.map(({ line }) => ({
    quantity: parseQuantity(quantityOf(line)),
    unitPrice: line.unitPrice,
  }));
  const totalValue = parseDecimal(total);
  const hasTotal = Number.isFinite(totalValue) && totalValue >= 0;
  const split = previewSplit(hasTotal ? totalValue : 0, rows);
  const diff = hasTotal ? diffText(totalValue, split.estimate) : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: FormErrors = { quantities: {} };
    if (!purchasedOn) found.purchasedOn = "Pick the date of the purchase";
    if (!hasTotal) {
      found.total = Number.isFinite(totalValue) ? "Can't be negative" : "Enter the amount on the receipt";
    }
    for (const { line } of lines) {
      const quantity = parseQuantity(quantityOf(line));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        found.quantities[line.lineId] = "Enter a quantity above 0";
      }
    }
    setErrors(found);
    if (found.purchasedOn || found.total || Object.keys(found.quantities).length > 0) return;

    const vendorId = vendorChoice !== NO_VENDOR && vendorChoice !== OTHER_VENDOR ? Number(vendorChoice) : undefined;
    const vendorName = vendorChoice === OTHER_VENDOR ? otherVendor.trim() || undefined : undefined;
    void onSubmit({
      purchasedOn,
      vendorId,
      vendor: vendorName,
      totalAmount: totalValue,
      lines: lines.map(({ line }) => ({
        lineId: line.lineId,
        quantity: parseQuantity(quantityOf(line)),
        markComplete: done[line.lineId] ? true : undefined,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-date`} className={FIELD_LABEL_CLASS}>
            Date
          </label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            required
            value={purchasedOn}
            onChange={(event) => setPurchasedOn(event.target.value)}
            className={`${FIELD_INPUT_CLASS} h-11`}
          />
          {errors.purchasedOn && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errors.purchasedOn}
            </p>
          )}
        </div>
        <VendorField
          vendors={vendors}
          choice={vendorChoice}
          otherName={otherVendor}
          onChoice={setVendorChoice}
          onOtherName={setOtherVendor}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-total`} className={FIELD_LABEL_CLASS}>
          Total paid (kr)
        </label>
        <input
          id={`${idPrefix}-total`}
          type="text"
          inputMode="decimal"
          required
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          aria-invalid={errors.total ? true : undefined}
          className={`${FIELD_INPUT_CLASS} h-12 text-lg font-semibold`}
        />
        {errors.total ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errors.total}
          </p>
        ) : (
          diff && <p className={`text-xs font-medium ${diff.className}`}>{diff.text}</p>
        )}
        {!hasTotal && !errors.total && (
          <p className={`text-xs ${MUTED_CLASS}`}>Enter the amount on the receipt</p>
        )}
      </div>

      <section aria-labelledby={`${idPrefix}-split`} className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 id={`${idPrefix}-split`} className="text-sm font-semibold text-gray-900 dark:text-white">
            Lines
          </h3>
          <span className={`text-xs ${MUTED_CLASS}`}>split by estimate share</span>
        </div>
        <p className={`text-xs ${MUTED_CLASS}`}>
          Bought less than needed? Lower the quantity. The rest stays on the shopping list at its
          estimated price.
        </p>
        <ul className="rounded-lg bg-gray-50 px-3 dark:bg-gray-900">
          {lines.map(({ line, unit }, index) => (
            <LineRow
              key={line.lineId}
              line={line}
              unit={unit}
              quantityText={quantityOf(line)}
              done={!!done[line.lineId]}
              amount={hasTotal ? formatKr(split.amounts[index]) : "—"}
              error={errors.quantities[line.lineId]}
              onQuantity={(text) => setQuantities((prev) => ({ ...prev, [line.lineId]: text }))}
              onDone={(value) => setDone((prev) => ({ ...prev, [line.lineId]: value }))}
            />
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="h-11">
          Save purchase{hasTotal ? ` · ${formatKr(totalValue)}` : ""}
        </Button>
      </div>
    </form>
  );
}
