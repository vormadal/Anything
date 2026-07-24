import type { JSONContent } from "@tiptap/react";

/**
 * The note body travels to and from the API as a JSON string holding a
 * ProseMirror/Tiptap document. The backend treats it as opaque apart from
 * flattening it to plain text for search (`NoteContent.ExtractPlainText`), so
 * the shape below is the frontend's contract with itself.
 */

/** A valid, empty ProseMirror document — what an editor starts from. */
export const EMPTY_NOTE_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/**
 * Parses a stored body into an editor document. A note whose body is missing or
 * unparseable still opens — as an empty document — rather than breaking the
 * page, mirroring the backend extractor's tolerance of malformed content.
 */
export function parseNoteDocument(contentJson?: string | null): JSONContent {
  if (!contentJson) return EMPTY_NOTE_DOCUMENT;

  try {
    const parsed: unknown = JSON.parse(contentJson);
    return isDocumentNode(parsed) ? parsed : EMPTY_NOTE_DOCUMENT;
  } catch {
    return EMPTY_NOTE_DOCUMENT;
  }
}

export function serializeNoteDocument(document: JSONContent): string {
  return JSON.stringify(document);
}

/**
 * True when the document holds no text and no non-text nodes. Used to decide
 * whether a note has a body worth showing, so an empty paragraph doesn't render
 * as a blank block. Any node that isn't a paragraph — a future entity
 * reference, a heading, a list — counts as content even with no text.
 */
export function isNoteDocumentEmpty(document: JSONContent): boolean {
  return !hasContent(document);
}

const STRUCTURAL_NODE_TYPES = new Set(["doc", "paragraph"]);

function hasContent(node: JSONContent): boolean {
  // A text node carries nothing but its text, so blank text is blank content —
  // checking its type first keeps it out of the "any other node counts" rule.
  if (node.type === "text") return (node.text ?? "").trim().length > 0;
  if (node.type && !STRUCTURAL_NODE_TYPES.has(node.type)) return true;
  return (node.content ?? []).some(hasContent);
}

function isDocumentNode(value: unknown): value is JSONContent {
  return typeof value === "object" && value !== null && (value as JSONContent).type === "doc";
}
