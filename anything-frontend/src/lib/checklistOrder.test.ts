import { sortMostRecentlyCheckedFirst, latestDate } from "./checklistOrder";

describe("sortMostRecentlyCheckedFirst", () => {
  it("puts the most recently modified item first", () => {
    const items = [
      { id: 1, modifiedOn: new Date("2024-01-01T00:00:00Z") },
      { id: 2, modifiedOn: new Date("2024-01-03T00:00:00Z") },
      { id: 3, modifiedOn: new Date("2024-01-02T00:00:00Z") },
    ];

    expect(sortMostRecentlyCheckedFirst(items).map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it("treats a missing modifiedOn as oldest, without throwing", () => {
    const items = [
      { id: 1, modifiedOn: new Date("2024-01-01T00:00:00Z") },
      { id: 2, modifiedOn: null },
      { id: 3 },
    ];

    expect(sortMostRecentlyCheckedFirst(items).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("keeps relative order stable when modifiedOn ties", () => {
    const items = [
      { id: 1, modifiedOn: undefined },
      { id: 2, modifiedOn: undefined },
      { id: 3, modifiedOn: undefined },
    ];

    expect(sortMostRecentlyCheckedFirst(items).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const items = [
      { id: 1, modifiedOn: new Date("2024-01-01T00:00:00Z") },
      { id: 2, modifiedOn: new Date("2024-01-03T00:00:00Z") },
    ];

    sortMostRecentlyCheckedFirst(items);

    expect(items.map((i) => i.id)).toEqual([1, 2]);
  });
});

describe("latestDate", () => {
  it("returns the latest of several dates", () => {
    const a = new Date("2024-01-01T00:00:00Z");
    const b = new Date("2024-01-05T00:00:00Z");
    const c = new Date("2024-01-03T00:00:00Z");

    expect(latestDate([a, b, c])).toBe(b);
  });

  it("ignores null and undefined entries", () => {
    const a = new Date("2024-01-01T00:00:00Z");

    expect(latestDate([null, a, undefined])).toBe(a);
  });

  it("returns null when nothing is set", () => {
    expect(latestDate([null, undefined])).toBeNull();
  });
});
