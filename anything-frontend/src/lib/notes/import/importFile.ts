import type { ParsedImport } from "./types";
import { parseTextFile } from "./plainText";
import { parseDocxFile } from "./docx";
import { parseMarkdownFile } from "./markdown";
import { LARGE_NOTE_HTML_LENGTH, titleFromFileName } from "./shared";

type ImportParser = (file: File) => Promise<ParsedImport>;

const PARSERS_BY_EXTENSION: Record<string, ImportParser> = {
  txt: parseTextFile,
  md: parseMarkdownFile,
  markdown: parseMarkdownFile,
  docx: parseDocxFile,
};

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/** Converts one file picked for import into HTML ready for `buildNoteDocument`. */
export async function parseImportFile(file: File): Promise<ParsedImport> {
  const parser = PARSERS_BY_EXTENSION[extensionOf(file.name)];
  if (!parser) {
    return {
      fileName: file.name,
      title: titleFromFileName(file.name),
      html: "",
      images: [],
      warnings: [],
      fatalError: "Only .txt, .md and .docx files can be imported.",
    };
  }

  const parsed = await parser(file);
  if (parsed.html.length <= LARGE_NOTE_HTML_LENGTH) return parsed;

  return {
    ...parsed,
    warnings: [...parsed.warnings, "This note is very large and may be trimmed when saved."],
  };
}
