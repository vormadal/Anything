"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RenovationPurchaseLineResponse, RenovationPurchaseResponse } from "@/lib/api-client/models/index";
import { formatKr, formatQty } from "@/lib/renovation";
import { formatDateOnly } from "./shoppingView";

interface PurchaseHistoryProps {
  purchases: readonly RenovationPurchaseResponse[];
  onAddToInventory: (purchaseId: number, line: RenovationPurchaseLineResponse) => void;
  onDeletePurchase: (purchaseId: number) => void;
}

const MUTED_CLASS = "text-gray-500 dark:text-gray-400";

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function PurchaseLine({
  line,
  onAddToInventory,
}: {
  line: RenovationPurchaseLineResponse;
  onAddToInventory: () => void;
}) {
  const inventoryItemId = line.inventoryItemId ?? null;
  const place = [line.roomName, line.lineLabel].filter(Boolean).join(" · ");
  const quantity = line.quantity === null || line.quantity === undefined ? "" : formatQty(line.quantity, line.unit);
  const amount = line.amount === null || line.amount === undefined ? "" : formatKr(line.amount);

  return (
    <li className="flex flex-col gap-2 border-t border-gray-100 py-3 first:border-t-0 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{place}</span>
          <span className={`text-xs ${MUTED_CLASS}`}>{quantity}</span>
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{amount}</span>
      </div>
      {inventoryItemId === null ? (
        <Button variant="outline" size="sm" onClick={onAddToInventory} className="h-11 self-start">
          Add to inventory
        </Button>
      ) : (
        <Link
          href={`/inventory/items/${inventoryItemId}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          In inventory
        </Link>
      )}
    </li>
  );
}

function PurchaseRow({
  purchase,
  onAddToInventory,
  onDeletePurchase,
}: {
  purchase: RenovationPurchaseResponse;
  onAddToInventory: (line: RenovationPurchaseLineResponse) => void;
  onDeletePurchase: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = purchase.lines ?? [];
  const title = purchase.vendor?.trim() || "No vendor";
  const meta = `${formatDateOnly(purchase.purchasedOn)} · ${countLabel(lines.length, "line", "lines")}`;
  const amount =
    purchase.totalAmount === null || purchase.totalAmount === undefined
      ? "No total"
      : formatKr(purchase.totalAmount);
  const panelId = `purchase-${purchase.id ?? 0}-lines`;

  return (
    <li className="border-t border-gray-100 first:border-t-0 dark:border-gray-700">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-[60px] w-full items-center gap-3 bg-white px-4 py-2.5 text-left text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{title}</span>
          <span className={`text-xs ${MUTED_CLASS}`}>{meta}</span>
        </span>
        <span className="whitespace-nowrap text-sm font-semibold">{amount}</span>
      </button>
      {expanded && (
        <div id={panelId} className="flex flex-col gap-2 bg-white px-4 pb-4 dark:bg-gray-800">
          <ul className="flex flex-col">
            {lines.map((line, index) => (
              <PurchaseLine
                key={line.lineId ?? index}
                line={line}
                onAddToInventory={() => onAddToInventory(line)}
              />
            ))}
          </ul>
          {purchase.notes && <p className={`text-xs ${MUTED_CLASS}`}>{purchase.notes}</p>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeletePurchase}
            className="h-11 self-start text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
            Delete purchase
          </Button>
        </div>
      )}
    </li>
  );
}

export function PurchaseHistory({ purchases, onAddToInventory, onDeletePurchase }: PurchaseHistoryProps) {
  return (
    <ul className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {purchases.map((purchase, index) => (
        <PurchaseRow
          key={purchase.id ?? index}
          purchase={purchase}
          onAddToInventory={(line) => onAddToInventory(purchase.id ?? 0, line)}
          onDeletePurchase={() => onDeletePurchase(purchase.id ?? 0)}
        />
      ))}
    </ul>
  );
}
