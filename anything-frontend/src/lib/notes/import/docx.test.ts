import { zipSync } from "fflate";
import { parseDocxFile } from "./docx";

const encoder = new TextEncoder();

/** A minimal but well-formed docx archive, built from the parts a test needs. */
function buildDocxFile(options: {
  fileName?: string;
  body: string;
  rels?: string;
  numbering?: string;
  media?: Record<string, Uint8Array>;
}): File {
  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<w:body>${options.body}</w:body></w:document>`;

  const files: Record<string, Uint8Array> = {
    "word/document.xml": encoder.encode(documentXml),
  };
  if (options.rels) files["word/_rels/document.xml.rels"] = encoder.encode(options.rels);
  if (options.numbering) files["word/numbering.xml"] = encoder.encode(options.numbering);
  for (const [path, bytes] of Object.entries(options.media ?? {})) files[`word/${path}`] = bytes;

  const zipped = zipSync(files);
  return new File([new Uint8Array(zipped)], options.fileName ?? "Note.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

const paragraph = (text: string, rPr = "") =>
  `<w:p><w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t>${text}</w:t></w:r></w:p>`;

const heading = (level: number, text: string) =>
  `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;

const listParagraph = (numId: string, text: string) =>
  `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>` +
  `<w:r><w:t>${text}</w:t></w:r></w:p>`;

const NUMBERING_XML =
  '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>' +
  '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>' +
  '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
  '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>' +
  "</w:numbering>";

describe("parseDocxFile", () => {
  it("derives the title from the filename stem", async () => {
    const file = buildDocxFile({ fileName: "Trip packing.docx", body: paragraph("Passport") });

    const result = await parseDocxFile(file);

    expect(result.title).toBe("Trip packing");
    expect(result.fatalError).toBeUndefined();
  });

  it("converts heading styles to heading tags", async () => {
    const file = buildDocxFile({ body: heading(2, "Packing list") });

    const result = await parseDocxFile(file);

    expect(result.html).toBe("<h2>Packing list</h2>");
  });

  it("converts bold and italic run properties to marks", async () => {
    const file = buildDocxFile({
      body: paragraph("Important", "<w:b/><w:i/>"),
    });

    const result = await parseDocxFile(file);

    expect(result.html).toBe("<p><em><strong>Important</strong></em></p>");
  });

  it("groups consecutive list paragraphs by their numbering format", async () => {
    const file = buildDocxFile({
      numbering: NUMBERING_XML,
      body: listParagraph("1", "Passport") + listParagraph("1", "Charger") + heading(1, "Second section"),
    });

    const result = await parseDocxFile(file);

    expect(result.html).toBe(
      "<ul><li><p>Passport</p></li><li><p>Charger</p></li></ul><h1>Second section</h1>"
    );
  });

  it("renders a decimal list as an ordered list", async () => {
    const file = buildDocxFile({ numbering: NUMBERING_XML, body: listParagraph("2", "Step one") });

    const result = await parseDocxFile(file);

    expect(result.html).toBe("<ol><li><p>Step one</p></li></ol>");
  });

  it("resolves an external hyperlink relationship to an anchor tag", async () => {
    const rels =
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="hyperlink" Target="https://example.com" TargetMode="External"/>' +
      "</Relationships>";
    const body =
      '<w:p><w:hyperlink r:id="rId1"><w:r><w:t>Example</w:t></w:r></w:hyperlink></w:p>';

    const result = await parseDocxFile(buildDocxFile({ body, rels }));

    expect(result.html).toBe('<p><a href="https://example.com">Example</a></p>');
  });

  it("extracts an embedded image as an upload candidate and inlines a placeholder", async () => {
    const rels =
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="image" Target="media/image1.png"/>' +
      "</Relationships>";
    const body =
      "<w:p><w:r><w:drawing><a:blip r:embed=\"rId1\"/></w:drawing></w:r></w:p>";
    const media = { "media/image1.png": new Uint8Array([0x89, 0x50, 0x4e, 0x47]) };

    const result = await parseDocxFile(buildDocxFile({ body, rels, media }));

    expect(result.images).toHaveLength(1);
    expect(result.images[0].fileName).toBe("image1.png");
    expect(result.images[0].blob.type).toBe("image/png");
    expect(result.html).toContain(`<img src="${result.images[0].placeholderId}">`);
  });

  it("converts a table's rows and cells", async () => {
    const body =
      "<w:tbl><w:tr>" +
      `<w:tc>${paragraph("Left")}</w:tc>` +
      `<w:tc>${paragraph("Right")}</w:tc>` +
      "</w:tr></w:tbl>";

    const result = await parseDocxFile(buildDocxFile({ body }));

    expect(result.html).toBe(
      "<table><tbody><tr><td><p>Left</p></td><td><p>Right</p></td></tr></tbody></table>"
    );
  });

  it("keeps a horizontally merged cell's span", async () => {
    const body =
      "<w:tbl><w:tr>" +
      `<w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr>${paragraph("Wide")}</w:tc>` +
      "</w:tr></w:tbl>";

    const result = await parseDocxFile(buildDocxFile({ body }));

    expect(result.html).toContain('<td colspan="2"><p>Wide</p></td>');
  });

  it("turns a vertically merged cell's continuation into a rowspan", async () => {
    const body =
      "<w:tbl>" +
      "<w:tr>" +
      `<w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr>${paragraph("Tall")}</w:tc>` +
      `<w:tc>${paragraph("One")}</w:tc>` +
      "</w:tr>" +
      "<w:tr>" +
      `<w:tc><w:tcPr><w:vMerge/></w:tcPr>${paragraph("")}</w:tc>` +
      `<w:tc>${paragraph("Two")}</w:tc>` +
      "</w:tr>" +
      "</w:tbl>";

    const result = await parseDocxFile(buildDocxFile({ body }));

    expect(result.html).toBe(
      "<table><tbody>" +
        '<tr><td rowspan="2"><p>Tall</p></td><td><p>One</p></td></tr>' +
        "<tr><td><p>Two</p></td></tr>" +
        "</tbody></table>"
    );
  });

  it("renders a repeated header row as header cells", async () => {
    const body =
      "<w:tbl>" +
      `<w:tr><w:trPr><w:tblHeader/></w:trPr><w:tc>${paragraph("Item")}</w:tc></w:tr>` +
      `<w:tr><w:tc>${paragraph("Milk")}</w:tc></w:tr>` +
      "</w:tbl>";

    const result = await parseDocxFile(buildDocxFile({ body }));

    expect(result.html).toContain("<th><p>Item</p></th>");
    expect(result.html).toContain("<td><p>Milk</p></td>");
  });

  it("treats a fully bold first row as a header row", async () => {
    const body =
      "<w:tbl>" +
      `<w:tr><w:tc>${paragraph("Item", "<w:b/>")}</w:tc></w:tr>` +
      `<w:tr><w:tc>${paragraph("Milk")}</w:tc></w:tr>` +
      "</w:tbl>";

    const result = await parseDocxFile(buildDocxFile({ body }));

    expect(result.html).toContain("<th><p><strong>Item</strong></p></th>");
    expect(result.html).toContain("<td><p>Milk</p></td>");
  });

  it("keeps a plain first row as data cells", async () => {
    const body =
      "<w:tbl>" +
      `<w:tr><w:tc>${paragraph("Item")}</w:tc></w:tr>` +
      `<w:tr><w:tc>${paragraph("Milk")}</w:tc></w:tr>` +
      "</w:tbl>";

    const result = await parseDocxFile(buildDocxFile({ body }));

    expect(result.html).not.toContain("<th>");
  });

  it("converts a list inside a cell as a list", async () => {
    const numbering =
      '<?xml version="1.0"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>' +
      '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>' +
      "</w:numbering>";
    const item = (text: string) =>
      `<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
    const body = `<w:tbl><w:tr><w:tc>${item("First")}${item("Second")}</w:tc></w:tr></w:tbl>`;

    const result = await parseDocxFile(buildDocxFile({ body, numbering }));

    expect(result.html).toBe(
      "<table><tbody><tr><td><ul><li><p>First</p></li><li><p>Second</p></li></ul></td></tr></tbody></table>"
    );
  });

  it("converts a table nested inside a cell without duplicating its cells", async () => {
    const inner = `<w:tbl><w:tr><w:tc>${paragraph("Inner")}</w:tc></w:tr></w:tbl>`;
    const body = `<w:tbl><w:tr><w:tc>${inner}</w:tc></w:tr></w:tbl>`;

    const result = await parseDocxFile(buildDocxFile({ body }));

    expect(result.html).toBe(
      "<table><tbody><tr><td><table><tbody><tr><td><p>Inner</p></td></tr></tbody></table></td></tr></tbody></table>"
    );
  });

  it("warns when the note has no content", async () => {
    const result = await parseDocxFile(buildDocxFile({ body: "<w:p/>" }));

    expect(result.warnings).toEqual(["This note is empty."]);
  });

  it("reports a fatal error for a file that isn't a valid archive", async () => {
    const file = new File(["not a zip"], "Note.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const result = await parseDocxFile(file);

    expect(result.fatalError).toBe("This file isn't a valid Word document.");
  });

  it("reports a fatal error for an archive with no document.xml", async () => {
    const file = new File([new Uint8Array(zipSync({ "readme.txt": encoder.encode("hi") }))], "Note.docx");

    const result = await parseDocxFile(file);

    expect(result.fatalError).toBe("This doesn't look like a Word document.");
  });
});
