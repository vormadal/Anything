"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { useEffect } from "react";
import { noteExtensions } from "@/lib/notes/extensions";
import { NOTE_PROSE_CLASSES } from "./noteProseClasses";

/**
 * Read-only rendering of a note body.
 *
 * Deliberately renders through the same Tiptap schema as the editor rather than
 * walking the JSON by hand: a node registered in `noteExtensions` — including a
 * future entity-reference node — then renders identically in both modes with no
 * second implementation to keep in sync.
 */
export function NoteContentView({ content }: { content: JSONContent }) {
  const editor = useEditor({
    extensions: noteExtensions,
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: `${NOTE_PROSE_CLASSES} focus:outline-none` },
    },
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) {
    return <div className="h-24" aria-busy="true" />;
  }

  return <EditorContent editor={editor} />;
}
