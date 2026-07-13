import { classifyOcrLines, downscaleImage } from "./ocr";

describe("classifyOcrLines", () => {
  it("uses the first non-empty line as the name", () => {
    const result = classifyOcrLines("\n\n  Pandekager  \n250 g mel\nWhisk everything together until smooth.");

    expect(result.name).toBe("Pandekager");
  });

  it("splits quantity-led lines from instruction sentences", () => {
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
      "en håndfuld hakkede mandler",
    ]);
    expect(result.stepsText.split("\n")).toEqual([
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

  describe("section headers", () => {
    it("uses Danish headers as hard boundaries and drops the header lines", () => {
      const result = classifyOcrLines(
        [
          "Pandekager",
          "Ingredienser:",
          "250 g mel",
          "5 dl mælk",
          "3 æg",
          "Fremgangsmåde",
          "Pisk æggene sammen med mælken.",
          "Tilsæt melet lidt ad gangen.",
          "Steg pandekagerne gyldne.",
        ].join("\n")
      );

      expect(result.name).toBe("Pandekager");
      expect(result.ingredientsText.split("\n")).toEqual(["250 g mel", "5 dl mælk", "3 æg"]);
      expect(result.stepsText.split("\n")).toEqual([
        "Pisk æggene sammen med mælken.",
        "Tilsæt melet lidt ad gangen.",
        "Steg pandekagerne gyldne.",
      ]);
    });

    it("matches uppercase English headers with trailing punctuation", () => {
      const result = classifyOcrLines(
        [
          "Banana bread",
          "INGREDIENTS:",
          "3 ripe bananas",
          "1/2 cup melted butter",
          "1 tsp baking soda",
          "METHOD",
          "Preheat the oven to 175 degrees.",
          "Mash the bananas with the butter.",
          "Bake for one hour.",
        ].join("\n")
      );

      expect(result.name).toBe("Banana bread");
      expect(result.ingredientsText.split("\n")).toEqual([
        "3 ripe bananas",
        "1/2 cup melted butter",
        "1 tsp baking soda",
      ]);
      expect(result.stepsText.split("\n")).toEqual([
        "Preheat the oven to 175 degrees.",
        "Mash the bananas with the butter.",
        "Bake for one hour.",
      ]);
    });

    it("accepts OCR-transliterated Danish headers (å read as aa)", () => {
      const result = classifyOcrLines(
        ["Suppe", "Ingredienser", "2 ds tomater", "Fremgangsmaade", "Hak grøntsagerne."].join("\n")
      );

      expect(result.ingredientsText).toBe("2 ds tomater");
      expect(result.stepsText).toBe("Hak grøntsagerne.");
    });

    it("leaves the name empty when the text starts with a header", () => {
      const result = classifyOcrLines("Ingredienser\n2 dl fløde\n1 tsk vanilje");

      expect(result.name).toBe("");
      expect(result.ingredientsText.split("\n")).toEqual(["2 dl fløde", "1 tsk vanilje"]);
      expect(result.stepsText).toBe("");
    });

    it("splits a trailing ingredients section that runs into unlabeled instructions", () => {
      const result = classifyOcrLines(
        [
          "Æblekage",
          "Ingredienser",
          "6 æbler",
          "100 g sukker",
          "Skræl æblerne og skær dem i både.",
          "Kog æblerne møre med sukkeret.",
        ].join("\n")
      );

      expect(result.ingredientsText.split("\n")).toEqual(["6 æbler", "100 g sukker"]);
      expect(result.stepsText.split("\n")).toEqual([
        "Skræl æblerne og skær dem i både.",
        "Kog æblerne møre med sukkeret.",
      ]);
    });

    it("keeps ambiguous short lines under an ingredients header as ingredients", () => {
      const result = classifyOcrLines("Dressing\nIngredienser\nsalt\npeber\ncitronsaft");

      expect(result.ingredientsText.split("\n")).toEqual(["salt", "peber", "citronsaft"]);
      expect(result.stepsText).toBe("");
    });
  });

  describe("headerless segmentation", () => {
    it("classifies numbered instructions as steps, not ingredients", () => {
      const result = classifyOcrLines(
        [
          "Tomato soup",
          "2 cans tomatoes",
          "1 onion",
          "2 tbsp olive oil",
          "1. Chop the onion finely.",
          "2. Heat the oil in a large pot.",
          "3. Add the tomatoes and simmer for 20 minutes.",
        ].join("\n")
      );

      expect(result.ingredientsText.split("\n")).toEqual([
        "2 cans tomatoes",
        "1 onion",
        "2 tbsp olive oil",
      ]);
      expect(result.stepsText.split("\n")).toEqual([
        "1. Chop the onion finely.",
        "2. Heat the oil in a large pot.",
        "3. Add the tomatoes and simmer for 20 minutes.",
      ]);
    });

    it("recognizes imperative Danish verbs as step starts", () => {
      const result = classifyOcrLines(
        [
          "Boller",
          "500 g mel",
          "50 g gær",
          "3 dl mælk",
          "Rør gæren ud i mælken.",
          "Ælt dejen godt.",
          "Lad dejen hæve i en time.",
          "Bag ved 220 grader.",
        ].join("\n")
      );

      expect(result.ingredientsText.split("\n")).toEqual(["500 g mel", "50 g gær", "3 dl mælk"]);
      expect(result.stepsText.split("\n")).toEqual([
        "Rør gæren ud i mælken.",
        "Ælt dejen godt.",
        "Lad dejen hæve i en time.",
        "Bag ved 220 grader.",
      ]);
    });

    it("absorbs a stray misread line into the surrounding steps block", () => {
      const result = classifyOcrLines(
        [
          "Kage",
          "200 g smør",
          "2 dl sukker",
          "Rør smørret blødt.",
          "kagen bages",
          "Sæt i ovnen.",
        ].join("\n")
      );

      expect(result.ingredientsText.split("\n")).toEqual(["200 g smør", "2 dl sukker"]);
      expect(result.stepsText.split("\n")).toEqual([
        "Rør smørret blødt.",
        "kagen bages",
        "Sæt i ovnen.",
      ]);
    });

    it("handles bulleted ingredients and ascii fractions", () => {
      const result = classifyOcrLines(
        [
          "Krydderkage",
          "- 1/2 tsk kanel",
          "- 1 1/2 dl fløde",
          "• 2 spsk honning",
          "Bland det hele og bag kagen.",
        ].join("\n")
      );

      expect(result.ingredientsText.split("\n")).toEqual([
        "- 1/2 tsk kanel",
        "- 1 1/2 dl fløde",
        "• 2 spsk honning",
      ]);
      expect(result.stepsText).toBe("Bland det hele og bag kagen.");
    });

    it("keeps a trailing note with the steps", () => {
      const result = classifyOcrLines(
        [
          "Suppe",
          "2 l vand",
          "1 løg",
          "Kog vandet op med løget.",
          "Server suppen rygende varm.",
          "Kan opbevares i køleskabet i tre dage.",
        ].join("\n")
      );

      expect(result.ingredientsText.split("\n")).toEqual(["2 l vand", "1 løg"]);
      expect(result.stepsText.split("\n")).toEqual([
        "Kog vandet op med løget.",
        "Server suppen rygende varm.",
        "Kan opbevares i køleskabet i tre dage.",
      ]);
    });

    it("puts everything after the name into steps when nothing looks like an ingredient", () => {
      const result = classifyOcrLines(
        "Grandmas trick\nAlways rest the dough overnight before you bake it in the morning."
      );

      expect(result.ingredientsText).toBe("");
      expect(result.stepsText).toBe(
        "Always rest the dough overnight before you bake it in the morning."
      );
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
