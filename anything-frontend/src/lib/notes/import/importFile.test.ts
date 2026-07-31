import { parseImportFile } from "./importFile";
import { LARGE_NOTE_HTML_LENGTH } from "./shared";

describe("parseImportFile", () => {
  it("routes a .txt file to the plain text parser", async () => {
    const result = await parseImportFile(new File(["Hello"], "note.txt", { type: "text/plain" }));

    expect(result.html).toBe("<p>Hello</p>");
    expect(result.fatalError).toBeUndefined();
  });

  it("routes a .DOCX file (case-insensitively) to the Word parser", async () => {
    const file = new File(["not really a docx"], "Note.DOCX");

    const result = await parseImportFile(file);

    expect(result.fatalError).toBe("This file isn't a valid Word document.");
  });

  it("rejects an unsupported file type without reading it", async () => {
    const result = await parseImportFile(new File(["<html/>"], "note.pdf", { type: "application/pdf" }));

    expect(result.fatalError).toBe("Only .txt and .docx files can be imported.");
    expect(result.title).toBe("note");
  });

  it("warns about a very large note without discarding it", async () => {
    const hugeLine = "a".repeat(LARGE_NOTE_HTML_LENGTH + 1);
    const result = await parseImportFile(new File([hugeLine], "big.txt", { type: "text/plain" }));

    expect(result.warnings).toContain("This note is very large and may be trimmed when saved.");
    expect(result.html.length).toBeGreaterThan(0);
  });
});
