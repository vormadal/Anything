import { parseTextFile } from "./plainText";

function textFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("parseTextFile", () => {
  it("wraps each line in its own paragraph", async () => {
    const result = await parseTextFile(textFile("Grocery list.txt", "Milk\nEggs\nBread"));

    expect(result.html).toBe("<p>Milk</p><p>Eggs</p><p>Bread</p>");
    expect(result.warnings).toEqual([]);
  });

  it("derives the title from the filename stem", async () => {
    const result = await parseTextFile(textFile("Grocery list.txt", "Milk"));

    expect(result.title).toBe("Grocery list");
  });

  it("escapes HTML-significant characters", async () => {
    const result = await parseTextFile(textFile("note.txt", "Tom & Jerry <3"));

    expect(result.html).toBe("<p>Tom &amp; Jerry &lt;3</p>");
  });

  it("warns when the file has no content", async () => {
    const result = await parseTextFile(textFile("empty.txt", "   \n\n"));

    expect(result.warnings).toEqual(["This note is empty."]);
  });

  it("preserves no images", async () => {
    const result = await parseTextFile(textFile("note.txt", "Hello"));

    expect(result.images).toEqual([]);
  });
});
