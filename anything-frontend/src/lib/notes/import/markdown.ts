import { marked } from "marked";
import type { ParsedImport } from "./types";
import { clampNoteTitle, titleFromFileName } from "./shared";

const FRONT_MATTER_FENCE_PATTERN = /^---[ \t]*$/;
// No `[ \t]*` before the capture: it would overlap with `(.*)`, giving the
// engine an ambiguous split to backtrack over on every non-title line. The
// value is trimmed after capture instead.
const FRONT_MATTER_TITLE_PATTERN = /^title:(.*)$/;
const SURROUNDING_QUOTES_PATTERN = /^"(.*)"$|^'(.*)'$/;
const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;
const LOCAL_IMAGE_WARNING = "Images stored next to this file weren't imported.";
const EMPTY_NOTE_WARNING = "This note is empty.";

interface MarkdownSource {
  /** The document with any front matter removed. */
  body: string;
  /** The front matter's `title`, when it had one. */
  title: string | null;
}

function unquote(value: string): string {
  const quoted = SURROUNDING_QUOTES_PATTERN.exec(value);
  return quoted ? (quoted[1] ?? quoted[2]) : value;
}

/**
 * Splits off a leading YAML front matter block (Obsidian, Jekyll and friends
 * write one). Only `title` is read — the rest is metadata the note has nowhere
 * to put, and leaving the block in the body would render as a stray heading.
 * Scanned line by line rather than with one regex over the whole document: the
 * block is delimited by whole lines, and a lazy `[\s\S]*?` spanning the file
 * would backtrack across it on every document that has no front matter at all.
 */
function readFrontMatter(markdown: string): MarkdownSource {
  const lines = markdown.split(/\r?\n/);
  if (!FRONT_MATTER_FENCE_PATTERN.test(lines[0])) return { body: markdown, title: null };

  const closing = lines.findIndex((line, index) => index > 0 && FRONT_MATTER_FENCE_PATTERN.test(line));
  if (closing === -1) return { body: markdown, title: null };

  const declared = lines
    .slice(1, closing)
    .map((line) => FRONT_MATTER_TITLE_PATTERN.exec(line)?.[1].trim())
    .find((value) => !!value);

  return {
    body: lines.slice(closing + 1).join("\n"),
    title: declared ? unquote(declared) : null,
  };
}

/**
 * A GFM task item renders as a checkbox input, which the note schema has no
 * node for and would silently drop along with its checked state. Swapping in a
 * ballot-box character keeps that state visible as text in an ordinary list.
 */
function replaceTaskCheckbox(checkbox: Element): void {
  const marker = checkbox.hasAttribute("checked") ? "☑" : "☐";
  checkbox.replaceWith(checkbox.ownerDocument.createTextNode(marker));
}

/**
 * Markdown references images rather than embedding them, so there are no bytes
 * to upload. An absolute `http(s)` source still resolves from the note, but a
 * path relative to the exported file points at something this app never
 * received. A paragraph left with nothing but the dropped image goes with it,
 * rather than becoming a blank line in the note. Returns whether any image was
 * dropped.
 */
function pruneUnreachableImages(body: HTMLElement): boolean {
  let dropped = false;

  for (const image of Array.from(body.querySelectorAll("img"))) {
    if (REMOTE_IMAGE_PATTERN.test(image.getAttribute("src") ?? "")) continue;

    const paragraph = image.parentElement;
    image.remove();
    if (paragraph?.tagName === "P" && !paragraph.hasChildNodes()) paragraph.remove();
    dropped = true;
  }

  return dropped;
}

/**
 * Collapses the newlines marked writes between block tags, so the output
 * matches the single-line HTML the other importers build by hand. Safe because
 * `breaks: true` leaves no bare newline inside a paragraph's inline content,
 * and marked escapes `<`/`>` inside code blocks — a newline in code is never
 * preceded by a literal `>`.
 */
function toCompactHtml(body: HTMLElement): string {
  return body.innerHTML.replace(/>\n+</g, "><").trim();
}

/**
 * Converts a Markdown (`.md`) file into HTML for `generateJSON`. Anything the
 * note schema has no node for — a horizontal rule, raw HTML — is dropped there
 * rather than here; this pass only handles the constructs worth degrading into
 * something the schema *does* have instead of losing outright. Tables are not
 * among them any more: the schema has table nodes, so `marked`'s GFM table
 * markup passes through untouched.
 */
export async function parseMarkdownFile(file: File): Promise<ParsedImport> {
  const { body: markdown, title } = readFrontMatter(await file.text());

  // Soft line breaks become `<br>` instead of folding into the previous line:
  // a note is written line by line, so the author's line breaks are closer to
  // what they saw in the app they exported from.
  const rendered = marked.parse(markdown, { async: false, gfm: true, breaks: true });
  const { body } = new DOMParser().parseFromString(rendered, "text/html");

  // GFM tables pass straight through: `marked` emits real table markup and the
  // note schema has nodes for all of it.
  for (const checkbox of Array.from(body.querySelectorAll('input[type="checkbox"]'))) {
    replaceTaskCheckbox(checkbox);
  }
  const droppedImages = pruneUnreachableImages(body);

  const html = toCompactHtml(body);
  const warnings = droppedImages ? [LOCAL_IMAGE_WARNING] : [];
  if (!html.replace(/<p><\/p>/g, "").trim()) warnings.push(EMPTY_NOTE_WARNING);

  return {
    fileName: file.name,
    title: title ? clampNoteTitle(title) : titleFromFileName(file.name),
    html,
    images: [],
    warnings,
  };
}
