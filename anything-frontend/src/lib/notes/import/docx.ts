import { unzipSync } from "fflate";
import type { ParsedImport, ParsedImportImage } from "./types";
import { mimeTypeForFileName, nextImagePlaceholderId, titleFromFileName } from "./shared";
import { DocxNumbering } from "./docxNumbering";
import { isBoldRun, renderParagraphInline, type DocxRunContext } from "./docxRuns";

const HEADING_STYLE_PATTERN = /^Heading(\d)$/i;
const MAX_HEADING_LEVEL = 6;

function paragraphStyleId(paragraph: Element): string | null {
  const pStyle = paragraph.getElementsByTagName("w:pPr")[0]?.getElementsByTagName("w:pStyle")[0];
  return pStyle?.getAttribute("w:val") ?? null;
}

function headingLevel(paragraph: Element): number | null {
  const styleId = paragraphStyleId(paragraph)?.replace(/\s+/g, "");
  const match = styleId ? HEADING_STYLE_PATTERN.exec(styleId) : null;
  if (!match) return null;
  const level = Number(match[1]);
  return level >= 1 && level <= MAX_HEADING_LEVEL ? level : null;
}

/**
 * The numbering list a paragraph belongs to, if any. Nesting (`w:ilvl`) is
 * deliberately ignored — the note schema's list nodes aren't nested either,
 * so every level of a Word list flattens to one list.
 */
function paragraphNumId(paragraph: Element): string | null {
  const numPr = paragraph.getElementsByTagName("w:pPr")[0]?.getElementsByTagName("w:numPr")[0];
  return numPr?.getElementsByTagName("w:numId")[0]?.getAttribute("w:val") ?? null;
}

interface OpenList {
  ordered: boolean;
  items: string[];
}

function renderList(list: OpenList): string {
  const tag = list.ordered ? "ol" : "ul";
  const items = list.items.map((item) => `<li><p>${item}</p></li>`).join("");
  return `<${tag}>${items}</${tag}>`;
}

/**
 * Word's XML nests: a table's own `w:tr`s sit alongside those of any table
 * inside one of its cells, and `getElementsByTagName` would return both. Every
 * structural lookup here walks direct children instead.
 */
function directChildren(parent: Element, ...tagNames: string[]): Element[] {
  return Array.from(parent.children).filter((child) => tagNames.includes(child.tagName));
}

/** A `w:val` that turns an OOXML toggle off rather than on. */
const OFF_VALUES = ["false", "0", "off"];

function isToggleElementOn(element: Element | undefined): boolean {
  if (!element) return false;
  const val = element.getAttribute("w:val")?.toLowerCase();
  return val === null || val === undefined || !OFF_VALUES.includes(val);
}

/** `w:tblHeader` marks a row Word repeats across page breaks — i.e. a header row. */
function isDeclaredHeaderRow(row: Element): boolean {
  const trPr = directChildren(row, "w:trPr")[0];
  return isToggleElementOn(trPr?.getElementsByTagName("w:tblHeader")[0]);
}

/**
 * Most Word tables never set `w:tblHeader` — it means "repeat this row on each
 * page", not "this row is a header" — so a fully bold first row is taken as
 * one. A wrong guess either way is one click of the toolbar's header toggle.
 */
function looksLikeHeaderRow(row: Element): boolean {
  const runs = directChildren(row, "w:tc")
    .flatMap((cell) => Array.from(cell.getElementsByTagName("w:r")))
    .filter((run) => (run.textContent ?? "").trim().length > 0);

  return runs.length > 0 && runs.every(isBoldRun);
}

interface TableCellModel {
  tag: "td" | "th";
  colspan: number;
  /** Grows as later rows contribute `w:vMerge` continuations. */
  rowspan: number;
  html: string;
}

function renderCell(cell: TableCellModel): string {
  const colspan = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : "";
  const rowspan = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : "";
  return `<${cell.tag}${colspan}${rowspan}>${cell.html}</${cell.tag}>`;
}

function cellSpan(tcPr: Element | undefined): number {
  const declared = Number(tcPr?.getElementsByTagName("w:gridSpan")[0]?.getAttribute("w:val"));
  return Number.isNaN(declared) || declared < 1 ? 1 : declared;
}

/**
 * Converts a `w:tbl` to an HTML table.
 *
 * Word writes a `w:tc` at *every* grid position, marking the continuations of
 * a vertical merge with a `w:vMerge` that has no `w:val` (only the cell that
 * starts one carries `w:val="restart"`). Those continuations are dropped and
 * counted onto the starting cell's `rowspan` instead, which is how HTML says
 * the same thing — so cells are modelled first and serialised at the end, once
 * every row that might extend a merge has been read.
 */
function convertTable(table: Element, ctx: DocxRunContext, numbering: DocxNumbering): string {
  const rows = directChildren(table, "w:tr");
  if (rows.length === 0) return "";

  const declaredHeaders = rows.filter(isDeclaredHeaderRow);
  const headerRows = new Set(declaredHeaders.length > 0 ? declaredHeaders : []);
  if (headerRows.size === 0 && looksLikeHeaderRow(rows[0])) headerRows.add(rows[0]);

  // Grid column index -> the cell currently merging downwards through it.
  const openMerges: (TableCellModel | null)[] = [];
  const modelled: TableCellModel[][] = [];

  for (const row of rows) {
    const cells: TableCellModel[] = [];
    let column = 0;

    for (const tc of directChildren(row, "w:tc")) {
      const tcPr = directChildren(tc, "w:tcPr")[0];
      const span = cellSpan(tcPr);
      const vMerge = tcPr?.getElementsByTagName("w:vMerge")[0];
      const startsMerge = vMerge?.getAttribute("w:val") === "restart";

      if (vMerge && !startsMerge) {
        // A continuation contributes a row to whatever started the merge; an
        // orphan (no starter, e.g. a truncated document) is simply dropped.
        const starter = openMerges[column];
        if (starter) starter.rowspan += 1;
        column += span;
        continue;
      }

      const cell: TableCellModel = {
        tag: headerRows.has(row) ? "th" : "td",
        colspan: span,
        rowspan: 1,
        html: convertBlocks(directChildren(tc, "w:p", "w:tbl"), ctx, numbering),
      };
      cells.push(cell);
      for (let covered = column; covered < column + span; covered++) {
        openMerges[covered] = startsMerge ? cell : null;
      }
      column += span;
    }

    modelled.push(cells);
  }

  const body = modelled
    .filter((cells) => cells.length > 0)
    .map((cells) => `<tr>${cells.map(renderCell).join("")}</tr>`)
    .join("");

  // No `thead`: the note schema has no node for it, and ProseMirror descends
  // through both wrappers, so one `tbody` keeps this to a single code path.
  return body ? `<table><tbody>${body}</tbody></table>` : "";
}

/**
 * Converts a run of block-level Word elements. Shared by the document body and
 * by each table cell, so a list or a heading inside a cell converts exactly as
 * it would outside one.
 */
function convertBlocks(children: Element[], ctx: DocxRunContext, numbering: DocxNumbering): string {
  let html = "";
  let openList: OpenList | null = null;
  const flushList = () => {
    if (openList) html += renderList(openList);
    openList = null;
  };

  for (const child of children) {
    if (child.tagName === "w:p") {
      const numId = paragraphNumId(child);
      const inline = renderParagraphInline(child, ctx);

      if (numId) {
        const ordered = numbering.isOrdered(numId);
        if (!openList || openList.ordered !== ordered) {
          flushList();
          openList = { ordered, items: [] };
        }
        openList.items.push(inline);
        continue;
      }

      flushList();
      const level = headingLevel(child);
      html += level ? `<h${level}>${inline}</h${level}>` : `<p>${inline}</p>`;
    } else if (child.tagName === "w:tbl") {
      flushList();
      html += convertTable(child, ctx, numbering);
    }
  }
  flushList();
  return html;
}

/** `word/_rels/document.xml.rels` → relationship id to target path. */
function parseRelationships(relsXml: Document): Map<string, string> {
  const rels = new Map<string, string>();
  for (const rel of Array.from(relsXml.getElementsByTagName("Relationship"))) {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (id && target) rels.set(id, target);
  }
  return rels;
}

function decodeXml(bytes: Uint8Array, parser: DOMParser): Document {
  return parser.parseFromString(new TextDecoder().decode(bytes), "application/xml");
}

function hasParseError(doc: Document): boolean {
  return doc.getElementsByTagName("parsererror").length > 0;
}

function failedImport(fileName: string, fatalError: string): ParsedImport {
  return { fileName, title: titleFromFileName(fileName), html: "", images: [], warnings: [], fatalError };
}

/**
 * Converts a Word (`.docx`) export into HTML for `generateJSON`. Word's XML
 * uses namespace-prefixed tag/attribute names (`w:p`, `w:val`, ...); every
 * lookup here matches those qualified names literally rather than resolving
 * namespaces — the browser's `DOMParser` preserves them as parsed, and this
 * sidesteps needing to register OOXML's namespace URIs by hand.
 */
export async function parseDocxFile(file: File): Promise<ParsedImport> {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return failedImport(file.name, "This file isn't a valid Word document.");
  }

  const documentXml = zip["word/document.xml"];
  if (!documentXml) return failedImport(file.name, "This doesn't look like a Word document.");

  const parser = new DOMParser();
  const doc = decodeXml(documentXml, parser);
  if (hasParseError(doc)) return failedImport(file.name, "This Word document could not be read.");

  const relsBytes = zip["word/_rels/document.xml.rels"];
  const rels = relsBytes ? parseRelationships(decodeXml(relsBytes, parser)) : new Map<string, string>();

  const numberingBytes = zip["word/numbering.xml"];
  const numbering = new DocxNumbering(numberingBytes ? decodeXml(numberingBytes, parser) : null);

  const images: ParsedImportImage[] = [];
  const ctx: DocxRunContext = {
    resolveHyperlink: (relId) => {
      const target = rels.get(relId);
      // Image relationships share the same id space as hyperlinks; only an
      // External target (Word never marks media relationships that way) is a link.
      return target?.startsWith("http") ? target : null;
    },
    resolveImage: (relId) => {
      const target = rels.get(relId);
      const bytes = target ? zip[`word/${target}`] : undefined;
      if (!target || !bytes) return null;

      const placeholderId = nextImagePlaceholderId();
      const fileName = target.split("/").pop() ?? "image";
      images.push({
        placeholderId,
        fileName,
        blob: new Blob([new Uint8Array(bytes)], { type: mimeTypeForFileName(fileName) }),
      });
      return placeholderId;
    },
  };

  const body = doc.getElementsByTagName("w:body")[0];
  const html = body ? convertBlocks(Array.from(body.children), ctx, numbering) : "";
  const warnings = html.replace(/<p><\/p>/g, "").trim() ? [] : ["This note is empty."];

  return { fileName: file.name, title: titleFromFileName(file.name), html, images, warnings };
}
