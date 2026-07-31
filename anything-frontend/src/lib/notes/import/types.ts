/** An image found while converting an imported file, not yet uploaded. */
export interface ParsedImportImage {
  /** Placeholder `src` written into `html`; swapped for the real URL after upload. */
  placeholderId: string;
  blob: Blob;
  fileName: string;
}

/** One file from the import picker, converted to HTML ready for `generateJSON`. */
export interface ParsedImport {
  fileName: string;
  /** Filename stem, clamped to `NOTE_TITLE_MAX_LENGTH` — Samsung names the export after the note. */
  title: string;
  /** HTML built from the source file; images use `placeholderId` as `src` until uploaded. */
  html: string;
  images: ParsedImportImage[];
  /** Empty when the file parsed cleanly; non-empty entries are shown to the user before import. */
  warnings: string[];
  /** Set instead of `html` when the file could not be parsed at all. */
  fatalError?: string;
}
