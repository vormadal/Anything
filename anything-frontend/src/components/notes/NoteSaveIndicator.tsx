"use client";

import type { NoteSaveStatus } from "@/hooks/useNoteAutosave";

/**
 * Replaces the Save button: a word in the header is the only feedback autosave
 * needs, and it costs no layout space of its own.
 */
export function NoteSaveIndicator({ status }: { status: NoteSaveStatus }) {
  const label = STATUS_LABELS[status];
  if (!label) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={`text-xs whitespace-nowrap ${
        status === "error" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
      }`}
    >
      {label}
    </span>
  );
}

const STATUS_LABELS: Record<NoteSaveStatus, string | null> = {
  idle: null,
  unsaved: "Unsaved",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved",
};
