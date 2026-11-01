import type { RenovationLineResponse } from "@/lib/api-client/models/index";
import {
  boughtVsEstimate,
  budgetBarWidths,
  formatSignedKr,
  percentSpent,
  varianceTextClass,
} from "./overviewMath";

function line(overrides: Partial<RenovationLineResponse>): RenovationLineResponse {
  return { ...overrides } as RenovationLineResponse;
}

describe("boughtVsEstimate", () => {
  it("compares actual with the estimate share for the quantity bought", () => {
    const result = boughtVsEstimate([
      // Half of the required quantity bought: estimate share is 500, actual 600.
      line({ estimate: 1000, requiredQuantity: 10, purchasedQuantity: 5, actual: 600 }),
      // Nothing bought: ignored entirely.
      line({ estimate: 400, requiredQuantity: 4, purchasedQuantity: 0, actual: 0 }),
    ]);

    expect(result).toEqual({
      actual: 600,
      estimateShare: 500,
      delta: 100,
      percent: 20,
      hasPurchases: true,
    });
  });

  it("reports under-estimate as a negative delta", () => {
    const result = boughtVsEstimate([
      line({ estimate: 1000, requiredQuantity: 10, purchasedQuantity: 10, actual: 800 }),
    ]);

    expect(result.delta).toBe(-200);
    expect(result.percent).toBe(-20);
  });

  it("has no percentage and no purchases when nothing was bought", () => {
    expect(boughtVsEstimate([line({ estimate: 500, requiredQuantity: 5, purchasedQuantity: 0 })])).toEqual({
      actual: 0,
      estimateShare: 0,
      delta: 0,
      percent: null,
      hasPurchases: false,
    });
  });

  it("treats a line with no required quantity as contributing no estimate share", () => {
    const result = boughtVsEstimate([
      line({ estimate: 300, requiredQuantity: 0, purchasedQuantity: 2, actual: 250 }),
    ]);

    expect(result.estimateShare).toBe(0);
    expect(result.percent).toBeNull();
    expect(result.hasPurchases).toBe(true);
  });
});

describe("budgetBarWidths", () => {
  it("splits spent, still-to-buy and headroom against the budget", () => {
    const widths = budgetBarWidths(92395, 187352, 200000);

    expect(widths.spentPercent).toBeCloseTo(46.1975, 3);
    expect(widths.toBuyPercent).toBeCloseTo(47.4785, 3);
    expect(widths.headroomPercent).toBeCloseTo(6.324, 3);
  });

  it("leaves no headroom and scales to the forecast when over budget", () => {
    const widths = budgetBarWidths(80, 120, 100);

    expect(widths.headroomPercent).toBe(0);
    expect(widths.spentPercent).toBeCloseTo(66.67, 1);
    expect(widths.toBuyPercent).toBeCloseTo(33.33, 1);
  });

  it("returns zero widths when there is nothing to scale against", () => {
    expect(budgetBarWidths(0, 0, 0)).toEqual({ spentPercent: 0, toBuyPercent: 0, headroomPercent: 0 });
  });
});

describe("percentSpent", () => {
  it("is zero without a denominator and caps at 100", () => {
    expect(percentSpent(50, 0)).toBe(0);
    expect(percentSpent(150, 100)).toBe(100);
    expect(percentSpent(25, 100)).toBe(25);
  });
});

describe("formatSignedKr and varianceTextClass", () => {
  it("signs over and under amounts and leaves zero unsigned", () => {
    expect(formatSignedKr(2593)).toBe("+2,593 kr");
    expect(formatSignedKr(-100)).toBe("−100 kr");
    expect(formatSignedKr(0)).toBe("0 kr");
  });

  it("colours over-estimate orange and under-estimate blue", () => {
    expect(varianceTextClass(1)).toContain("text-orange-700");
    expect(varianceTextClass(-1)).toContain("text-blue-700");
    expect(varianceTextClass(0)).not.toContain("orange");
  });
});
