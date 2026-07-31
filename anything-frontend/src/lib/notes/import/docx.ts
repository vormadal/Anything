import { unzipSync } from "fflate";
import type { ParsedImport, ParsedImportImage } from "./types";
import { mimeTypeForFileName, nextImagePlaceholderId, titleFromFileName } from "./shared";
import { DocxNumbering } from "./docxNumbering";
import { renderParagraphInline, type DocxRunContext } from "./docxRuns";

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
 * Every cell's paragraphs become their own `<p>` — the note schema has no
 * table node, so a table's structure can't survive the import, only its text.
 */
function convertTable(table: Element, ctx: DocxRunContext): string {
  let html = "";
  for (const cell of Array.from(table.getElementsByTagName("w:tc"))) {
    for (const paragraph of Array.from(cell.getElementsByTagName("w:p"))) {
      const inline = renderParagraphInline(paragraph, ctx);
      if (inline) html += `<p>${inline}</p>`;
    }
  }
  return html;
}

function convertBody(body: Element, ctx: DocxRunContext, numbering: DocxNumbering): string {
  let html = "";
  let openList: OpenList | null = null;
  const flushList = () => {
    if (openList) html += renderList(openList);
    openList = null;
  };

  for (const child of Array.from(body.children)) {
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
      html += convertTable(child, ctx);
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
  const html = body ? convertBody(body, ctx, numbering) : "";
  const warnings = html.replace(/<p><\/p>/g, "").trim() ? [] : ["This note is empty."];

  return { fileName: file.name, title: titleFromFileName(file.name), html, images, warnings };
}
