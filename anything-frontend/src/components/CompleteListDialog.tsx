"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  uncheckedCount: number;
  isPending: boolean;
  onKeep: () => void;
  onComplete: () => void;
}

export function CompleteListDialog({
  open,
  onOpenChange,
  title,
  uncheckedCount,
  isPending,
  onKeep,
  onComplete,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          There {uncheckedCount === 1 ? "is" : "are"}{" "}
          {uncheckedCount} unchecked{" "}
          {uncheckedCount === 1 ? "item" : "items"} remaining. Would you like to
          mark {uncheckedCount === 1 ? "it" : "them"} as complete too?
        </p>
        <DialogFooter className="flex gap-2 sm:flex-row flex-col">
          <Button variant="outline" onClick={onKeep} disabled={isPending}>
            No, keep them
          </Button>
          <Button onClick={onComplete} disabled={isPending}>
            Yes, mark all complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
