import type { RenovationLineResponse } from "@/lib/api-client/models/index";
import {
  formatSignedAmount,
  groupLines,
  isConflict,
  lineStatusLabel,
  lineVariance,
  requiredQuantityWithWaste,
} from "./roomDisplay";

function line(overrides: Partial<RenovationLineResponse>): RenovationLineResponse {
  return { id: 1, label: "Line", group: "Surfaces", status: "NotStarted", unit: "m²", ...overrides };
}

describe("lineStatusLabel", () => {
  it("names each status the way the room page shows it", () => {
    expect(lineStatusLabel(line({ status: "NotStarted" }))).toBe("Estimate");
    expect(
      lineStatusLabel(line({ status: "Partial", purchasedQuantity: 6, requiredQuantity: 13.9 })),
    ).toBe("Partial · 6.0 m² of 13.9 m²");
    expect(lineStatusLabel(line({ status: "Complete" }))).toBe("Bought");
  });
});

describe("lineVariance", () => {
  it("is null until something is bought, then actual minus estimate", () => {
    expect(lineVariance(line({ status: "NotStarted", estimate: 516 }))).toBeNull();
    expect(lineVariance(line({ status: "Complete", estimate: 516, actual: 480 }))).toBe(-36);
  });
});

describe("formatSignedAmount", () => {
  it("signs over, under and even amounts with thousands separators", () => {
    expect(formatSignedAmount(2950)).toBe("+2,950");
    expect(formatSignedAmount(-376)).toBe("−376");
    expect(formatSignedAmount(0)).toBe("±0");
  });
});

describe("groupLines", () => {
  it("keeps the Surfaces / Fixtures / Labour order, sorts by sortOrder and counts bought lines", () => {
    const groups = groupLines([
      line({ id: 3, group: "Labour", label: "Plumber" }),
      line({ id: 2, group: "Surfaces", label: "Underlay", sortOrder: 2, status: "Complete" }),
      line({ id: 1, group: "Surfaces", label: "Floor", sortOrder: 1 }),
      line({ id: 4, group: "Fixtures", label: "Cabinets", status: "Complete" }),
    ]);
    expect(groups.map((group) => group.name)).toEqual(["Surfaces", "Fixtures", "Labour"]);
    expect(groups[0].lines.map((l) => l.label)).toEqual(["Floor", "Underlay"]);
    expect(groups[0].boughtCount).toBe(1);
  });
});

describe("requiredQuantityWithWaste", () => {
  it("returns the stored quantity when the waste is unchanged", () => {
    expect(requiredQuantityWithWaste(line({ requiredQuantity: 13.9, wastePercent: 10 }), 10)).toBe(13.9);
  });

  it("re-derives the quantity from the base when the waste changes", () => {
    expect(requiredQuantityWithWaste(line({ requiredQuantity: 13.9, wastePercent: 10 }), 0)).toBe(12.64);
  });
});

describe("isConflict", () => {
  it("is true only for a 409 response", () => {
    expect(isConflict({ responseStatusCode: 409 })).toBe(true);
    expect(isConflict({ responseStatusCode: 500 })).toBe(false);
    expect(isConflict(new Error("boom"))).toBe(false);
  });
});
