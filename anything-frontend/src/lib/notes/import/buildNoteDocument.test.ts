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

  it("parses a table into table, row and cell nodes", () => {
    const parsed: ParsedImport = {
      fileName: "note.md",
      title: "Note",
      html: "<table><tbody><tr><th>Item</th></tr><tr><td>Milk</td></tr></tbody></table>",
      images: [],
      warnings: [],
    };

    const document = buildNoteDocument(parsed, new Map());

    // `thead`/`tbody` have no node in the schema; the parser descends through
    // them, and a cell's bare text is wrapped in the paragraph its `block+`
    // content expression requires.
    expect(document.content).toEqual([
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                attrs: expect.objectContaining({ colspan: 1, rowspan: 1 }),
                content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: expect.objectContaining({ colspan: 1, rowspan: 1 }),
                content: [{ type: "paragraph", content: [{ type: "text", text: "Milk" }] }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("keeps a merged cell's colspan and rowspan", () => {
    const parsed: ParsedImport = {
      fileName: "note.docx",
      title: "Note",
      html: '<table><tbody><tr><td colspan="2" rowspan="2"><p>Wide</p></td></tr></tbody></table>',
      images: [],
      warnings: [],
    };

    const document = buildNoteDocument(parsed, new Map());
    const cell = document.content?.[0].content?.[0].content?.[0];

    expect(cell?.attrs).toEqual(expect.objectContaining({ colspan: 2, rowspan: 2 }));
  });

  it("backfills an empty cell with a paragraph", () => {
    const parsed: ParsedImport = {
      fileName: "note.docx",
      title: "Note",
      html: "<table><tbody><tr><td></td></tr></tbody></table>",
      images: [],
      warnings: [],
    };

    const document = buildNoteDocument(parsed, new Map());
    const cell = document.content?.[0].content?.[0].content?.[0];

    expect(cell?.type).toBe("tableCell");
    expect(cell?.content).toEqual([{ type: "paragraph" }]);
  });
});
