"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TemplateConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

/** Confirms a template reset or removal. Both are destructive to the household's own template. */
export function TemplateConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  isPending,
  onConfirm,
  onOpenChange,
}: TemplateConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{message}</p>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
