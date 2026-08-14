"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { useEffect, useMemo } from "react";
import { createNoteExtensions, type UploadNoteImageFn } from "@/lib/notes/extensions";
import { NoteEditorToolbar } from "./NoteEditorToolbar";
import { NOTE_PROSE_CLASSES } from "./noteProseClasses";

interface NoteEditorProps {
  /**
   * The document to start from. Read once, on mount: a later change to this
   * prop is deliberately ignored so a background refetch of the note can't
   * discard edits in progress. Remount the editor (e.g. via a `key`) to load a
   * different note.
   */
  value: JSONContent;
  onChange: (document: JSONContent) => void;
  /** Marks the editing surface for assistive tech; defaults to "Note content". */
  label?: string;
  /** Uploads an image and reports where it landed, for the toolbar button and paste/drop. */
  onUploadImage: UploadNoteImageFn;
}

const DEFAULT_LABEL = "Note content";

/**
 * The editor fills whatever space its parent gives it — the note page hands it
 * everything below the header — so the whole page is the writing surface and a
 * click anywhere in it lands the caret.
 */
const SURFACE_CLASSES = "flex grow flex-col bg-white dark:bg-gray-800 print:block";

/**
 * The rich-text editing surface for a note.
 *
 * Loaded through `next/dynamic` with `ssr: false` by its callers: ProseMirror
 * touches the DOM on construction, and keeping it out of the server bundle also
 * keeps the editor off pages that only render note summaries.
 */
export function NoteEditor({ value, onChange, label = DEFAULT_LABEL, onUploadImage }: NoteEditorProps) {
  // Built once, alongside `value` above: the editor itself is only ever
  // created on mount (see useEditor's default `deps = []`), so rebuilding
  // this on every render would be wasted work.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, mirrors `value`
  const extensions = useMemo(() => createNoteExtensions(onUploadImage), []);

  const editor = useEditor({
    extensions,
    content: value,
    // Required under the App Router: rendering the editor during the first
    // client render would mismatch the server-rendered markup.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        // `note-editor` is the hook the placeholder CSS in globals.css targets.
        class: `note-editor ${NOTE_PROSE_CLASSES} grow w-full min-w-0 px-4 py-3 focus:outline-none`,
      },
    },
    onUpdate: ({ editor: updated }) => onChange(updated.getJSON()),
  });

  // Destroy on unmount — useEditor keeps a ProseMirror view alive otherwise.
  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) {
    return <div className={SURFACE_CLASSES} aria-busy="true" />;
  }

  return (
    <div className={SURFACE_CLASSES}>
      {/* Pinned under the app header so formatting stays reachable however far
          down a long note the user has scrolled. */}
      <div className="sticky top-14 z-30 bg-white dark:bg-gray-800 print:hidden">
        <NoteEditorToolbar editor={editor} onUploadImage={onUploadImage} />
      </div>
      <EditorContent editor={editor} className="flex min-w-0 grow flex-col print:block" />
    </div>
  );
}
