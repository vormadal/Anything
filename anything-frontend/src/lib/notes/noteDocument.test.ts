import {
  EMPTY_NOTE_DOCUMENT,
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
