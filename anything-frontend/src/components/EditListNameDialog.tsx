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
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isPending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function EditListNameDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
  isPending,
  inputRef,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit list name</DialogTitle>
        </DialogHeader>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onOpenChange(false);
          }}
          className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          aria-label="Edit list name"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isPending} aria-label="Save list name">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
