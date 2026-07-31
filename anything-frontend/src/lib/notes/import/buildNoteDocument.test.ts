import { buildNoteDocument } from "./buildNoteDocument";
import type { ParsedImport } from "./types";

describe("buildNoteDocument", () => {
  it("parses plain HTML into a note document", () => {
    const parsed: ParsedImport = {
      fileName: "note.txt",
      title: "Note",
      html: "<p>Hello</p>",
      images: [],
      warnings: [],
    };

    const document = buildNoteDocument(parsed, new Map());

    expect(document).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    });
  });

  it("swaps a placeholder image src for its uploaded url and carries the storage key", () => {
    const parsed: ParsedImport = {
      fileName: "note.docx",
      title: "Note",
      html: '<p>Photo:</p><img src="note-import-placeholder://1">',
      images: [{ placeholderId: "note-import-placeholder://1", fileName: "image1.png", blob: new Blob() }],
      warnings: [],
    };
    const uploaded = new Map([
      ["note-import-placeholder://1", { src: "https://images.example/a.png", storageKey: "notes/a.png" }],
    ]);

    const document = buildNoteDocument(parsed, uploaded);

    const imageNode = document.content?.find((node) => node.type === "image");
    expect(imageNode?.attrs).toEqual({
      src: "https://images.example/a.png",
      storageKey: "notes/a.png",
      alt: null,
      title: null,
      width: null,
      height: null,
    });
  });

  it("drops an image whose upload result is missing", () => {
    const parsed: ParsedImport = {
      fileName: "note.docx",
      title: "Note",
      html: '<img src="note-import-placeholder://1">',
      images: [{ placeholderId: "note-import-placeholder://1", fileName: "image1.png", blob: new Blob() }],
      warnings: [],
    };

    const document = buildNoteDocument(parsed, new Map());

    expect(document.content?.some((node) => node.type === "image")).toBe(false);
  });
});
