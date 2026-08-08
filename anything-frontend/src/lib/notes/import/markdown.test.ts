import { parseMarkdownFile } from "./markdown";

const FILE_NAME = "note.md";

function markdownFile(name: string, content: string): File {
  return new File([content], name, { type: "text/markdown" });
}

describe("parseMarkdownFile", () => {
  it("converts headings and paragraphs", async () => {
    const result = await parseMarkdownFile(markdownFile("Trip.md", "# Packing\n\nDon't forget the charger."));

    expect(result.html).toBe("<h1>Packing</h1><p>Don't forget the charger.</p>");
    expect(result.warnings).toEqual([]);
  });

  it("converts inline emphasis, strikethrough and code", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "**bold** *italic* ~~gone~~ `code`"));

    expect(result.html).toBe("<p><strong>bold</strong> <em>italic</em> <del>gone</del> <code>code</code></p>");
  });

  it("keeps a nested list nested", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "- fruit\n  - apple\n- bread"));

    expect(result.html).toBe("<ul><li>fruit<ul><li>apple</li></ul></li><li>bread</li></ul>");
  });

  it("keeps a link's target", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "See [the docs](https://example.test/docs)."));

    expect(result.html).toBe('<p>See <a href="https://example.test/docs">the docs</a>.</p>');
  });

  it("keeps a fenced code block's language", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "```js\nconst a = 1;\n```"));

    expect(result.html).toBe('<pre><code class="language-js">const a = 1;\n</code></pre>');
  });

  it("keeps a single line break as a hard break", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "first line\nsecond line"));

    expect(result.html).toBe("<p>first line<br>second line</p>");
  });

  it("flattens a table's cells into paragraphs", async () => {
    const table = "| Item | Qty |\n| --- | --- |\n| Milk | 2 |";

    const result = await parseMarkdownFile(markdownFile(FILE_NAME, table));

    expect(result.html).toBe("<p>Item</p><p>Qty</p><p>Milk</p><p>2</p>");
  });

  it("turns task items into checked and unchecked list items", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "- [ ] pack\n- [x] book flight"));

    expect(result.html).toBe("<ul><li>☐ pack</li><li>☑ book flight</li></ul>");
  });

  it("keeps an image hosted at an absolute URL", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "![a cat](https://example.test/cat.png)"));

    expect(result.html).toBe('<p><img src="https://example.test/cat.png" alt="a cat"></p>');
    expect(result.warnings).toEqual([]);
  });

  it("drops an image stored next to the file and warns once", async () => {
    const body = "The kitchen:\n\n![one](./img/one.png)\n\n![two](img/two.png)";

    const result = await parseMarkdownFile(markdownFile(FILE_NAME, body));

    expect(result.html).toBe("<p>The kitchen:</p>");
    expect(result.warnings).toEqual(["Images stored next to this file weren't imported."]);
  });

  it("warns that a note is empty when its only content was an unreachable image", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "![one](./img/one.png)"));

    expect(result.warnings).toEqual([
      "Images stored next to this file weren't imported.",
      "This note is empty.",
    ]);
  });

  it("never produces images to upload", async () => {
    const result = await parseMarkdownFile(markdownFile(FILE_NAME, "![a cat](https://example.test/cat.png)"));

    expect(result.images).toEqual([]);
  });

  it("derives the title from the filename stem", async () => {
    const result = await parseMarkdownFile(markdownFile("Grocery list.md", "Milk"));

    expect(result.title).toBe("Grocery list");
  });

  it("prefers a title declared in front matter, and keeps the block out of the body", async () => {
    const body = '---\ntitle: "Weekend plans"\ntags: [travel]\n---\n\nLeave at eight.';

    const result = await parseMarkdownFile(markdownFile("2024-05-01.md", body));

    expect(result.title).toBe("Weekend plans");
    expect(result.html).toBe("<p>Leave at eight.</p>");
  });

  it("falls back to the filename when front matter declares no title", async () => {
    const result = await parseMarkdownFile(markdownFile("Ideas.md", "---\ntags: [travel]\n---\n\nSomething."));

    expect(result.title).toBe("Ideas");
    expect(result.html).toBe("<p>Something.</p>");
  });

  it("warns when the file has no content", async () => {
    const result = await parseMarkdownFile(markdownFile("empty.md", "   \n\n"));

    expect(result.warnings).toEqual(["This note is empty."]);
  });
});
