import { NOTE_TITLE_MAX_LENGTH, UNTITLED_NOTE_TITLE } from "@/lib/notes/noteDocument";

/** Escapes text for safe inclusion in an HTML string built by hand. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Trims a candidate title to what the API accepts, falling back when it's blank. */
export function clampNoteTitle(candidate: string): string {
  const title = candidate.trim();
  if (!title) return UNTITLED_NOTE_TITLE;
  return title.length > NOTE_TITLE_MAX_LENGTH ? title.slice(0, NOTE_TITLE_MAX_LENGTH).trimEnd() : title;
}

/**
 * Samsung Notes names each exported file after the note itself, so the
 * filename stem is the title — clamped to what the API accepts.
 */
export function titleFromFileName(fileName: string): string {
  return clampNoteTitle(fileName.replace(/\.[^./\\]+$/, ""));
}

let placeholderCounter = 0;

/** A `src` value unique within one import run, replaced with a real URL once the image is uploaded. */
export function nextImagePlaceholderId(): string {
  placeholderCounter += 1;
  return `note-import-placeholder://${placeholderCounter}`;
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
};

/** Best-effort content type for a media file pulled out of a document archive. */
export function mimeTypeForFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_TYPES[extension] ?? "application/octet-stream";
}

/**
 * A note this large risks being rejected by the API's `ContentJson` length
 * limit once its ProseMirror JSON (larger than the source HTML) is built —
 * checked once here so every parser gets the same guard for free.
 */
export const LARGE_NOTE_HTML_LENGTH = 200_000;
