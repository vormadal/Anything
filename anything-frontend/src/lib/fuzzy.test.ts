import { fuzzyRank, fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("ranks exact match highest, then prefix, then substring", () => {
    expect(fuzzyScore("milk", "milk")).toBeGreaterThan(fuzzyScore("milk", "milkshake"));
    expect(fuzzyScore("milk", "milkshake")).toBeGreaterThan(fuzzyScore("milk", "oat milk"));
  });

  it("is case-insensitive and trims", () => {
    expect(fuzzyScore("  MILK ", "milk")).toBe(fuzzyScore("milk", "milk"));
  });

  it("matches a subsequence (missing letters)", () => {
    expect(fuzzyScore("bnna", "banana")).toBeGreaterThan(0);
  });

  it("tolerates a single typo", () => {
    // "tomatoe" -> "tomato": a trailing extra letter is one edit away.
    expect(fuzzyScore("tomatoe", "tomato")).toBeGreaterThan(0);
    // wrong middle letter
    expect(fuzzyScore("chikcen", "chicken")).toBeGreaterThan(0);
  });

  it("drops clearly unrelated candidates", () => {
    expect(fuzzyScore("milk", "watermelon")).toBe(-1);
  });
});

describe("fuzzyRank", () => {
  const items = [
    { name: "Oat milk" },
    { name: "Milk" },
    { name: "Milkshake" },
    { name: "Butter" },
  ];

  it("orders most relevant first", () => {
    const result = fuzzyRank(items, "milk", (i) => i.name);
    expect(result.map((i) => i.name)).toEqual(["Milk", "Milkshake", "Oat milk"]);
  });

  it("returns a stable copy of all items for a blank query", () => {
    const result = fuzzyRank(items, "   ", (i) => i.name);
    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });

  it("still surfaces a match despite a typo", () => {
    const result = fuzzyRank(items, "mlik", (i) => i.name);
    expect(result.map((i) => i.name)).toContain("Milk");
  });

  it("excludes non-matches", () => {
    const result = fuzzyRank(items, "milk", (i) => i.name);
    expect(result.map((i) => i.name)).not.toContain("Butter");
  });
});
