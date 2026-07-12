import { classifyOcrLines, downscaleImage } from "./ocr";

describe("classifyOcrLines", () => {
  it("uses the first non-empty line as the name", () => {
    const result = classifyOcrLines("\n\n  Pandekager  \n250 g mel\nWhisk everything together until smooth.");

    expect(result.name).toBe("Pandekager");
  });

  it("classifies numeric and unit-prefixed lines as ingredients", () => {
    const result = classifyOcrLines(
      [
        "Pandekager",
        "250 g mel",
        "½ tsk salt",
        "spsk sukker",
        "en håndfuld hakkede mandler",
        "Whisk the flour, milk and eggs together until the batter is smooth.",
        "Fry thin pancakes on a hot pan.",
      ].join("\n")
    );

    expect(result.ingredientsText.split("\n")).toEqual([
      "250 g mel",
      "½ tsk salt",
      "spsk sukker",
    ]);
    expect(result.stepsText.split("\n")).toEqual([
      "en håndfuld hakkede mandler",
      "Whisk the flour, milk and eggs together until the batter is smooth.",
      "Fry thin pancakes on a hot pan.",
    ]);
  });

  it("treats long lines as steps even when they mention units", () => {
    const result = classifyOcrLines(
      "Cake\nAdd the g flour a little at a time while stirring so the batter does not clump."
    );

    expect(result.ingredientsText).toBe("");
    expect(result.stepsText).toContain("a little at a time");
  });

  it("returns empty fields for empty input", () => {
    expect(classifyOcrLines("")).toEqual({
      name: "",
      ingredientsText: "",
      stepsText: "",
    });
  });
});

describe("downscaleImage", () => {
  it("falls back to the original file when the image cannot be decoded", async () => {
    const file = new File(["not an image"], "photo.jpg", { type: "image/jpeg" });

    // jsdom has no createImageBitmap, so decoding fails and the file is returned.
    await expect(downscaleImage(file)).resolves.toBe(file);
  });
});
