import { escapeHtml } from "./shared";

/**
 * Resolves the two kinds of relationship references a paragraph's inline
 * content can carry — supplied by `docx.ts`, which owns the archive and the
 * parsed `.rels` file, so this module only ever sees plain callbacks.
 */
export interface DocxRunContext {
  /** `r:id` on a `w:hyperlink` → the link target, or `null` if unresolvable. */
  resolveHyperlink: (relId: string) => string | null;
  /** `r:embed` on a run's `w:drawing` → an `<img>` `src` (a placeholder, recorded for upload), or `null`. */
  resolveImage: (relId: string) => string | null;
}

/** A toggle property (`w:b`, `w:i`, `w:strike`) is on unless explicitly turned off. */
function isToggleOn(rPr: Element | undefined, tagName: string): boolean {
  const el = rPr?.getElementsByTagName(tagName)[0];
  if (!el) return false;
  const val = el.getAttribute("w:val")?.toLowerCase();
  return val === undefined || !["false", "0", "off"].includes(val);
}

function hasUnderline(rPr: Element | undefined): boolean {
  const el = rPr?.getElementsByTagName("w:u")[0];
  return !!el && el.getAttribute("w:val") !== "none";
}

/**
 * Whether a run is bold. Exported for `docx.ts`'s header-row heuristic — a
 * table that doesn't declare a repeating header row is treated as having one
 * when its whole first row is bold.
 */
export function isBoldRun(run: Element): boolean {
  return isToggleOn(run.getElementsByTagName("w:rPr")[0] ?? undefined, "w:b");
}

function renderRun(run: Element, ctx: DocxRunContext): string {
  let inner = "";
  for (const child of Array.from(run.children)) {
    if (child.tagName === "w:t") {
      inner += escapeHtml(child.textContent ?? "");
    } else if (child.tagName === "w:tab") {
      inner += "\t";
    } else if (child.tagName === "w:br") {
      inner += "<br>";
    } else if (child.tagName === "w:drawing") {
      const embedId = child.getElementsByTagName("a:blip")[0]?.getAttribute("r:embed");
      const src = embedId ? ctx.resolveImage(embedId) : null;
      if (src) inner += `<img src="${escapeHtml(src)}">`;
    }
  }
  if (!inner) return "";

  const rPr = run.getElementsByTagName("w:rPr")[0] ?? undefined;
  if (isToggleOn(rPr, "w:b")) inner = `<strong>${inner}</strong>`;
  if (isToggleOn(rPr, "w:i")) inner = `<em>${inner}</em>`;
  if (isToggleOn(rPr, "w:strike")) inner = `<s>${inner}</s>`;
  if (hasUnderline(rPr)) inner = `<u>${inner}</u>`;
  return inner;
}

/** Renders a paragraph's runs and hyperlinks (but not its list/heading structure) to inline HTML. */
export function renderParagraphInline(paragraph: Element, ctx: DocxRunContext): string {
  let html = "";
  for (const child of Array.from(paragraph.children)) {
    if (child.tagName === "w:hyperlink") {
      const relId = child.getAttribute("r:id");
      const href = relId ? ctx.resolveHyperlink(relId) : null;
      const inner = Array.from(child.children)
        .filter((run) => run.tagName === "w:r")
        .map((run) => renderRun(run, ctx))
        .join("");
      html += href ? `<a href="${escapeHtml(href)}">${inner}</a>` : inner;
    } else if (child.tagName === "w:r") {
      html += renderRun(child, ctx);
    }
    // Other children (w:pPr, w:bookmarkStart, ...) carry no renderable content.
  }
  return html;
}
