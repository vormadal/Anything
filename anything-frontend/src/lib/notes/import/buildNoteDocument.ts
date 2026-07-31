import { generateJSON } from "@tiptap/core";
import type { JSONContent } from "@tiptap/react";
import { noteExtensions } from "@/lib/notes/extensions";
import type { ParsedImport } from "./types";

/** Where each of a `ParsedImport`'s placeholder images ended up, keyed by `placeholderId`. */
export type UploadedImagesByPlaceholder = Map<string, { src: string; storageKey: string }>;

/**
 * Swaps each image's placeholder `src` for where it was uploaded, then parses
 * the resulting HTML into a note document. `generateJSON` runs the HTML
 * through the note editor's own schema, so a node or mark the editor doesn't
 * support (a table, an unrecognised style) is silently dropped rather than
 * producing a document the editor can't open.
 *
 * An image whose upload failed is dropped rather than left with a broken
 * `note-import-placeholder://` `src` — the placeholder is only ever
 * meaningful within one import run, so it must never reach a saved note.
 */
export function buildNoteDocument(parsed: ParsedImport, uploadedImages: UploadedImagesByPlaceholder): JSONContent {
  let html = parsed.html;
  for (const image of parsed.images) {
    const uploaded = uploadedImages.get(image.placeholderId);
    const placeholderTag = `<img src="${image.placeholderId}">`;
    html = html.replace(
      placeholderTag,
      uploaded ? `<img src="${uploaded.src}" data-storage-key="${uploaded.storageKey}">` : ""
    );
  }

  return generateJSON(html, noteExtensions);
}
