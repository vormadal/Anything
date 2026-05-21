"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExportSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onExportAll: () => void;
  onExportUncategorized: () => void;
}

export function ExportSuggestionsDialog({
  open,
  onOpenChange,
  isPending,
  onExportAll,
  onExportUncategorized,
}: ExportSuggestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export suggestions</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose what to export.
        </p>
        <DialogFooter className="flex gap-2 sm:flex-row flex-col">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onExportUncategorized} disabled={isPending}>
            Export uncategorized
          </Button>
          <Button onClick={onExportAll} disabled={isPending}>
            Export all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
