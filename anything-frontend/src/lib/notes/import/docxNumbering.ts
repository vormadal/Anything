/**
 * Resolves whether a Word list (`w:numId`) renders as bulleted or numbered,
 * from `word/numbering.xml`. Only the list's outermost level is consulted —
 * nested list levels are flattened to one level by `docx.ts`, so a deeper
 * level's own format never matters.
 */
export class DocxNumbering {
  private readonly numIdToAbstractId = new Map<string, string>();
  private readonly abstractIdToOrdered = new Map<string, boolean>();

  constructor(numberingXml: Document | null) {
    if (!numberingXml) return;

    for (const num of Array.from(numberingXml.getElementsByTagName("w:num"))) {
      const numId = num.getAttribute("w:numId");
      const abstractId = num.getElementsByTagName("w:abstractNumId")[0]?.getAttribute("w:val");
      if (numId && abstractId) this.numIdToAbstractId.set(numId, abstractId);
    }

    for (const abstractNum of Array.from(numberingXml.getElementsByTagName("w:abstractNum"))) {
      const abstractId = abstractNum.getAttribute("w:abstractNumId");
      if (!abstractId) continue;

      const outermostLevel = Array.from(abstractNum.getElementsByTagName("w:lvl")).find(
        (lvl) => lvl.getAttribute("w:ilvl") === "0"
      );
      const numFmt = outermostLevel?.getElementsByTagName("w:numFmt")[0]?.getAttribute("w:val");
      this.abstractIdToOrdered.set(abstractId, numFmt !== "bullet");
    }
  }

  isOrdered(numId: string): boolean {
    const abstractId = this.numIdToAbstractId.get(numId);
    if (!abstractId) return false;
    return this.abstractIdToOrdered.get(abstractId) ?? false;
  }
}
