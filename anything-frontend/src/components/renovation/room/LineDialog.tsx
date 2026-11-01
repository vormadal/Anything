"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import type { RenovationLineResponse } from "@/lib/api-client/models/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeleteRenovationLine } from "@/hooks/useRenovation";
import { formatKr, formatQty } from "@/lib/renovation";
import {
  GENERIC_ERROR_MESSAGE,
  LINE_HAS_PURCHASES_MESSAGE,
  FIELD_ERROR_CLASS,
  isConflict,
  isPurchased,
  lineVariance,
  formatSignedAmount,
  varianceClass,
  type RoomDialogState,
} from "./roomDisplay";

interface LineDialogProps {
  projectId: number;
  line: RenovationLineResponse;
  onOpen: (next: RoomDialogState) => void;
  onClose: () => void;
}

const DANGER_BUTTON_CLASS = "min-h-[44px] w-full text-red-600 dark:text-red-400";
const ACTION_BUTTON_CLASS = "min-h-[44px] w-full justify-between";

/** The sheet opened by tapping a budget line: its numbers and the actions on it. */
export function LineDialog({ projectId, line, onOpen, onClose }: LineDialogProps) {
  const lineId = line.id ?? 0;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteLine = useDeleteRenovationLine(projectId);
  const variance = lineVariance(line);
  const unit = line.unit ?? "";

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteLine.mutateAsync(lineId);
      onClose();
    } catch (err) {
      setError(isConflict(err) ? LINE_HAS_PURCHASES_MESSAGE : GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{line.label}</DialogTitle>
        </DialogHeader>
        {line.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">{line.description}</p>
        )}

        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Estimate</span>
            <span className="font-semibold">{formatKr(line.estimate ?? 0)}</span>
          </div>
          {isPurchased(line) && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Actual</span>
              <span className="font-semibold">
                {formatKr(line.actual ?? 0)}
                {variance !== null && (
                  <span className={`ml-2 text-xs font-medium ${varianceClass(variance)}`}>
                    {formatSignedAmount(variance)} vs est.
                  </span>
                )}
              </span>
            </div>
          )}
          <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatQty(line.requiredQuantity ?? 0, unit)} incl. waste · {formatKr(line.unitPrice ?? 0)}
            {unit ? ` per ${unit}` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className={ACTION_BUTTON_CLASS}
            onClick={() => onOpen({ kind: "material", lineId })}
          >
            <span className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              Change material
            </span>
          </Button>
          <Button
            variant="outline"
            className={ACTION_BUTTON_CLASS}
            onClick={() => onOpen({ kind: "editLine", lineId })}
          >
            <span className="flex items-center gap-2">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit line
            </span>
          </Button>
          <Link
            href={`/renovation/${projectId}/shopping?line=${lineId}`}
            className="flex min-h-[44px] items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-4 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span>Record a purchase</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          {confirming ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Delete this line? Its estimate leaves the room budget.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-[44px] flex-1" onClick={() => setConfirming(false)}>
                  Keep line
                </Button>
                <Button
                  variant="destructive"
                  className="min-h-[44px] flex-1"
                  onClick={handleDelete}
                  disabled={deleteLine.isPending}
                >
                  Yes, delete
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className={DANGER_BUTTON_CLASS} onClick={() => setConfirming(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete line
            </Button>
          )}
          {error && (
            <p role="alert" className={`mt-2 ${FIELD_ERROR_CLASS}`}>
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
