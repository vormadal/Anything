import type { ParsedImport } from "./types";
import { parseTextFile } from "./plainText";
import { parseDocxFile } from "./docx";
import { LARGE_NOTE_HTML_LENGTH, titleFromFileName } from "./shared";

const SUPPORTED_EXTENSIONS = new Set(["txt", "docx"]);

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/** Converts one file picked for import into HTML ready for `buildNoteDocument`. */
export async function parseImportFile(file: File): Promise<ParsedImport> {
  const extension = extensionOf(file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return {
      fileName: file.name,
      title: titleFromFileName(file.name),
      html: "",
      images: [],
      warnings: [],
      fatalError: "Only .txt and .docx files can be imported.",
    };
  }

  const parsed = extension === "docx" ? await parseDocxFile(file) : await parseTextFile(file);
  if (parsed.html.length <= LARGE_NOTE_HTML_LENGTH) return parsed;

  return {
    ...parsed,
    warnings: [...parsed.warnings, "This note is very large and may be trimmed when saved."],
  };
}
