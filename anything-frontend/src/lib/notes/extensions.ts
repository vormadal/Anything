import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import type { Extensions } from "@tiptap/react";

export const NOTE_PLACEHOLDER = "Start writing…";

/**
 * The note editor's node/mark schema, shared by the editable editor and the
 * read-only renderer so both always agree on what a stored document can contain.
 *
 * **This is the extension point for referencing other entities.** A recipe or
 * shopping-list reference becomes a custom Tiptap node appended to this array —
 * conventionally an inline, atomic node named `entityReference` with
 * `attrs: { entityType, entityId, label }` and no text child. The backend
 * extractor already understands that shape: `NoteContent.AppendObjectNode`
 * flattens a node's `attrs.label` into the search index, so a referenced
 * recipe stays findable by name without any backend change. Registering the
 * node here makes it render in both modes at once.
 */
export const noteExtensions: Extensions = [
  StarterKit.configure({
    // The note is a body of prose, not a document — a horizontal rule adds a
    // structural affordance the toolbar has no room to explain.
    horizontalRule: false,
  }),
  Placeholder.configure({ placeholder: NOTE_PLACEHOLDER }),
];
