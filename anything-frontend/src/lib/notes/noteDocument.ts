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

/** Longest title the API accepts — `StringLength(200)` on the note contracts. */
export const NOTE_TITLE_MAX_LENGTH = 200;

/** How much of the first line becomes the note's title. */
export const NOTE_TITLE_MAX_WORDS = 6;

/** Stands in for the title while the first line is still blank. */
export const UNTITLED_NOTE_TITLE = "Untitled note";

/**
 * The note's title is its first line, trimmed to `NOTE_TITLE_MAX_WORDS` words —
 * the user never types it separately. A first line longer than the API's limit
 * is cut to fit rather than rejected, since the user can't see the limit.
 */
export function deriveNoteTitle(document: JSONContent): string {
  const [firstBlock] = collectTextBlocks(document, []);
  const words = nodeText(firstBlock).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return UNTITLED_NOTE_TITLE;

  const title = words.slice(0, NOTE_TITLE_MAX_WORDS).join(" ");
  return title.length > NOTE_TITLE_MAX_LENGTH
    ? title.slice(0, NOTE_TITLE_MAX_LENGTH).trimEnd()
    : title;
}

/**
 * True once the first line has text and something follows it — the user pressed
 * Enter, so the heading is settled. That is the moment a note being written for
 * the first time becomes worth creating on the server.
 */
export function hasCompletedFirstLine(document: JSONContent): boolean {
  const blocks = collectTextBlocks(document, []);
  return blocks.length > 1 && nodeText(blocks[0]).trim().length > 0;
}

/** Block nodes that hold text directly; everything else only wraps them. */
const TEXT_BLOCK_TYPES = new Set(["paragraph", "heading", "codeBlock"]);

/**
 * Flattens the document to its text-bearing blocks in reading order, so a first
 * line stays the first line whether it is a plain paragraph, a heading, or the
 * paragraph inside the first bullet.
 */
function collectTextBlocks(node: JSONContent, blocks: JSONContent[]): JSONContent[] {
  if (node.type && TEXT_BLOCK_TYPES.has(node.type)) {
    // A text block's children are inline nodes, never further blocks.
    blocks.push(node);
    return blocks;
  }

  for (const child of node.content ?? []) collectTextBlocks(child, blocks);
  return blocks;
}

function nodeText(node: JSONContent | undefined): string {
  if (!node) return "";

  const own = node.type === "text" ? (node.text ?? "") : "";
  return own + (node.content ?? []).map(nodeText).join("");
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
