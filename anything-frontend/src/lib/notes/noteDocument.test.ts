import {
  EMPTY_NOTE_DOCUMENT,
  UNTITLED_NOTE_TITLE,
  deriveNoteTitle,
  hasCompletedFirstLine,
  isNoteDocumentEmpty,
  parseNoteDocument,
  serializeNoteDocument,
} from "./noteDocument";

describe("parseNoteDocument", () => {
  it("returns an empty document for missing content", () => {
    expect(parseNoteDocument(null)).toEqual(EMPTY_NOTE_DOCUMENT);
    expect(parseNoteDocument(undefined)).toEqual(EMPTY_NOTE_DOCUMENT);
    expect(parseNoteDocument("")).toEqual(EMPTY_NOTE_DOCUMENT);
  });

  it("returns an empty document for unparseable content instead of throwing", () => {
    expect(parseNoteDocument("{not json")).toEqual(EMPTY_NOTE_DOCUMENT);
  });

  it("returns an empty document for JSON that is not a ProseMirror doc", () => {
    expect(parseNoteDocument('{"type":"paragraph"}')).toEqual(EMPTY_NOTE_DOCUMENT);
    expect(parseNoteDocument("[1,2,3]")).toEqual(EMPTY_NOTE_DOCUMENT);
  });

  it("round-trips a stored document", () => {
    const document = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Buy milk" }] }],
    };

    expect(parseNoteDocument(serializeNoteDocument(document))).toEqual(document);
  });
});

const paragraph = (text?: string) =>
  text === undefined ? { type: "paragraph" } : { type: "paragraph", content: [{ type: "text", text }] };

describe("deriveNoteTitle", () => {
  it("uses the first line", () => {
    expect(deriveNoteTitle({ type: "doc", content: [paragraph("Wifi password"), paragraph("Guest network")] })).toBe(
      "Wifi password"
    );
  });

  it("keeps at most six words", () => {
    expect(
      deriveNoteTitle({ type: "doc", content: [paragraph("one two three four five six seven eight")] })
    ).toBe("one two three four five six");
  });

  it("collapses the whitespace a line can pick up", () => {
    expect(deriveNoteTitle({ type: "doc", content: [paragraph("  Buy   milk  ")] })).toBe("Buy milk");
  });

  it("falls back to a placeholder while the first line is blank", () => {
    expect(deriveNoteTitle(EMPTY_NOTE_DOCUMENT)).toBe(UNTITLED_NOTE_TITLE);
    expect(deriveNoteTitle({ type: "doc", content: [paragraph("   ")] })).toBe(UNTITLED_NOTE_TITLE);
  });

  it("reads a first line that is a heading or a bullet", () => {
    expect(
      deriveNoteTitle({
        type: "doc",
        content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Packing list" }] }],
      })
    ).toBe("Packing list");

    expect(
      deriveNoteTitle({
        type: "doc",
        content: [
          { type: "bulletList", content: [{ type: "listItem", content: [paragraph("Passports")] }] },
        ],
      })
    ).toBe("Passports");
  });

  it("joins the marked-up runs a formatted line is split into", () => {
    expect(
      deriveNoteTitle({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Wifi " },
              { type: "text", marks: [{ type: "bold" }], text: "password" },
            ],
          },
        ],
      })
    ).toBe("Wifi password");
  });
});

describe("hasCompletedFirstLine", () => {
  it("is false while the note is still on its first line", () => {
    expect(hasCompletedFirstLine(EMPTY_NOTE_DOCUMENT)).toBe(false);
    expect(hasCompletedFirstLine({ type: "doc", content: [paragraph("Wifi password")] })).toBe(false);
  });

  it("is false when Enter was pressed on a blank first line", () => {
    expect(hasCompletedFirstLine({ type: "doc", content: [paragraph(), paragraph()] })).toBe(false);
  });

  it("is true once a written first line is followed by another block", () => {
    expect(hasCompletedFirstLine({ type: "doc", content: [paragraph("Wifi password"), paragraph()] })).toBe(
      true
    );
  });
});

describe("isNoteDocumentEmpty", () => {
  it("treats a blank document as empty", () => {
    expect(isNoteDocumentEmpty(EMPTY_NOTE_DOCUMENT)).toBe(true);
    expect(
      isNoteDocumentEmpty({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "   " }] }],
      })
    ).toBe(true);
  });

  it("treats any text as content", () => {
    expect(
      isNoteDocumentEmpty({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
      })
    ).toBe(false);
  });

  // A reference node carries no text, so counting only text would render a note
  // that is entirely a recipe reference as "empty".
  it("treats a textless non-paragraph node as content", () => {
    expect(
      isNoteDocumentEmpty({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "entityReference", attrs: { entityType: "Recipe", entityId: 1, label: "Lasagne" } },
            ],
          },
        ],
      })
    ).toBe(false);
  });
});

describe("note documents containing a table", () => {
  const tableDocument = {
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Shopping" }] }],
              },
            ],
          },
        ],
      },
    ],
  };

  it("derives a title from the first cell of a leading table", () => {
    expect(deriveNoteTitle(tableDocument)).toBe("Shopping");
  });

  it("does not treat a table-only note as empty", () => {
    expect(isNoteDocumentEmpty(tableDocument)).toBe(false);
  });
});
