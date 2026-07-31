import type { ParsedImport } from "./types";
import { escapeHtml, titleFromFileName } from "./shared";

/** Converts a `.txt` export into HTML: one paragraph per line. */
export async function parseTextFile(file: File): Promise<ParsedImport> {
  const text = await file.text();
  const lines = text.split(/\r\n|\r|\n/);
  const html = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const warnings = lines.every((line) => line.trim().length === 0) ? ["This note is empty."] : [];

  return {
    fileName: file.name,
    title: titleFromFileName(file.name),
    html,
    images: [],
    warnings,
  };
}
