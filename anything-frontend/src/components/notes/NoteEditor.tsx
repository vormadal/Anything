"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { useEffect } from "react";
import { noteExtensions } from "@/lib/notes/extensions";
import { NoteEditorToolbar } from "./NoteEditorToolbar";
import { NOTE_PROSE_CLASSES } from "./noteProseClasses";

interface NoteEditorProps {
  /** Initial document. Changes to this prop reload the editor's content. */
  value: JSONContent;
  onChange: (document: JSONContent) => void;
  /** Marks the editing surface for assistive tech; defaults to "Note content". */
  label?: string;
}

const DEFAULT_LABEL = "Note content";

/**
 * The rich-text editing surface for a note.
 *
 * Loaded through `next/dynamic` with `ssr: false` by its callers: ProseMirror
 * touches the DOM on construction, and keeping it out of the server bundle also
 * keeps the editor off pages that only render note summaries.
 */
export function NoteEditor({ value, onChange, label = DEFAULT_LABEL }: NoteEditorProps) {
  const editor = useEditor({
    extensions: noteExtensions,
    content: value,
    // Required under the App Router: rendering the editor during the first
    // client render would mismatch the server-rendered markup.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        class: `${NOTE_PROSE_CLASSES} min-h-[12rem] px-3 py-2 focus:outline-none`,
      },
    },
    onUpdate: ({ editor: updated }) => onChange(updated.getJSON()),
  });

  // Destroy on unmount — useEditor keeps a ProseMirror view alive otherwise.
  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) {
    return (
      <div
        className="min-h-[14rem] rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        aria-busy="true"
      />
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-700 dark:bg-gray-800">
      <NoteEditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
