"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { JSONContent } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { EMPTY_NOTE_DOCUMENT, serializeNoteDocument } from "@/lib/notes/noteDocument";

// ProseMirror constructs against the DOM, so the editor can't render on the
// server; loading it lazily also keeps it out of the bundle for pages that only
// show note summaries.
const NoteEditor = dynamic(() => import("./NoteEditor").then((m) => m.NoteEditor), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[14rem] rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      aria-busy="true"
    />
  ),
});

export interface NoteFormValues {
  title: string;
  contentJson: string;
}

interface NoteFormProps {
  initialTitle?: string;
  initialDocument?: JSONContent;
  submitLabel: string;
  isPending?: boolean;
  onSubmit: (values: NoteFormValues) => void;
  onCancel: () => void;
}

const TITLE_REQUIRED_MESSAGE = "Title is required.";
const INPUT_CLASSES =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/** Title + rich-text body form, shared by note creation and in-place editing. */
export function NoteForm({
  initialTitle = "",
  initialDocument = EMPTY_NOTE_DOCUMENT,
  submitLabel,
  isPending = false,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [noteDocument, setNoteDocument] = useState<JSONContent>(initialDocument);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(TITLE_REQUIRED_MESSAGE);
      return;
    }

    setTitleError(null);
    onSubmit({ title: trimmed, contentJson: serializeNoteDocument(noteDocument) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="note-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError(null);
          }}
          placeholder="e.g. Wifi password, Holiday packing"
          required
          maxLength={200}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "note-title-error" : undefined}
          className={INPUT_CLASSES}
        />
        {titleError && (
          <p id="note-title-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</p>
        <NoteEditor value={initialDocument} onChange={setNoteDocument} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
