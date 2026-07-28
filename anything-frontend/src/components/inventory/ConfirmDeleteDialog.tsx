"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_HINT } from "@/components/inventory/inventoryFormStyles";

interface ConfirmDeleteDialogProps {
  open: boolean;
  title: string;
  message: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDeleteDialog({
  open,
  title,
  message,
  isPending,
  onConfirm,
  onOpenChange,
}: ConfirmDeleteDialogProps) {
  const isOnline = useOnlineStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{message}</p>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || !isOnline}
            title={isOnline ? undefined : OFFLINE_HINT}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
