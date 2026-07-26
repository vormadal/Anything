"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NOTE_TITLE_MAX_LENGTH } from "@/lib/notes/noteDocument";

interface RenameNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The title to start from — the derived one until the note is renamed. */
  title: string;
  onRename: (title: string) => void;
}

const TITLE_REQUIRED_MESSAGE = "Title is required.";

/**
 * The only place a note's title is typed. Until it is used, the title tracks the
 * note's first line; saving here detaches it so the body can change freely.
 */
export function RenameNoteDialog({
  open,
  onOpenChange,
  title,
  onRename,
}: RenameNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename note</DialogTitle>
        </DialogHeader>
        {/* The form only exists while the dialog is open, so it always starts
            from the current title — which may have moved on with the first line
            since the last time the dialog was closed. */}
        {open && (
          <RenameNoteForm
            title={title}
            onRename={onRename}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenameNoteForm({
  title,
  onRename,
  onOpenChange,
}: Omit<RenameNoteDialogProps, "open">) {
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError(TITLE_REQUIRED_MESSAGE);
      return;
    }

    onRename(trimmed);
    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="note-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Title
        </label>
        <input
          id="note-title"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          required
          maxLength={NOTE_TITLE_MAX_LENGTH}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "note-title-error" : undefined}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && (
          <p
            id="note-title-error"
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
