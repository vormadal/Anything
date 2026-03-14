import {
  ALL_DAYS,
  DEFAULT_ACTIVE_DAYS,
  toDateInputValue,
  toUtcMidnight,
  bitmaskToDaySet,
  daySetToBitmask,
} from "./foodPlanUtils";

describe("foodPlanUtils", () => {
  describe("ALL_DAYS", () => {
    it("contains all seven days of the week starting with Monday", () => {
      expect(ALL_DAYS).toEqual([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]);
    });

    it("has exactly 7 entries", () => {
      expect(ALL_DAYS).toHaveLength(7);
    });
  });

  describe("DEFAULT_ACTIVE_DAYS", () => {
    it("equals 31 (bitmask for Monday through Friday)", () => {
      expect(DEFAULT_ACTIVE_DAYS).toBe(31);
    });
  });

  describe("toDateInputValue", () => {
    it("formats a date as YYYY-MM-DD", () => {
      const date = new Date(2026, 2, 14); // March 14, 2026
      expect(toDateInputValue(date)).toBe("2026-03-14");
    });

    it("zero-pads single-digit months", () => {
      const date = new Date(2026, 0, 15); // January 15
      expect(toDateInputValue(date)).toBe("2026-01-15");
    });

    it("zero-pads single-digit days", () => {
      const date = new Date(2026, 11, 5); // December 5
      expect(toDateInputValue(date)).toBe("2026-12-05");
    });

    it("zero-pads both single-digit month and day", () => {
      const date = new Date(2026, 0, 1); // January 1
      expect(toDateInputValue(date)).toBe("2026-01-01");
    });

    it("handles double-digit month and day without extra padding", () => {
      const date = new Date(2026, 10, 25); // November 25
      expect(toDateInputValue(date)).toBe("2026-11-25");
    });

    it("handles end of year", () => {
      const date = new Date(2025, 11, 31); // December 31
      expect(toDateInputValue(date)).toBe("2025-12-31");
    });

    it("handles leap year date", () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024
      expect(toDateInputValue(date)).toBe("2024-02-29");
    });
  });

  describe("toUtcMidnight", () => {
    it("returns a date at UTC midnight", () => {
      const date = new Date(2026, 2, 14, 15, 30, 45);
      const result = toUtcMidnight(date);

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it("preserves the year, month, and day in UTC", () => {
      const date = new Date(2026, 5, 20, 23, 59, 59);
      const result = toUtcMidnight(date);

      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(5);
      expect(result.getUTCDate()).toBe(20);
    });

    it("uses the local date values (not UTC) from the input", () => {
      const date = new Date(2026, 0, 1, 0, 0, 0);
      const result = toUtcMidnight(date);

      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe("bitmaskToDaySet", () => {
    it("returns an empty set for bitmask 0", () => {
      const result = bitmaskToDaySet(0);
      expect(result.size).toBe(0);
    });

    it("returns Monday through Friday for bitmask 31 (0b0011111)", () => {
      const result = bitmaskToDaySet(31);
      expect(result).toEqual(new Set([0, 1, 2, 3, 4]));
    });

    it("returns all seven days for bitmask 127 (0b1111111)", () => {
      const result = bitmaskToDaySet(127);
      expect(result).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]));
    });

    it("returns only Monday for bitmask 1 (0b0000001)", () => {
      const result = bitmaskToDaySet(1);
      expect(result).toEqual(new Set([0]));
    });

    it("returns only Sunday for bitmask 64 (0b1000000)", () => {
      const result = bitmaskToDaySet(64);
      expect(result).toEqual(new Set([6]));
    });

    it("returns Saturday and Sunday for bitmask 96 (0b1100000)", () => {
      const result = bitmaskToDaySet(96);
      expect(result).toEqual(new Set([5, 6]));
    });

    it("handles each individual day correctly", () => {
      for (let i = 0; i < 7; i++) {
        const bitmask = 1 << i;
        const result = bitmaskToDaySet(bitmask);
        expect(result).toEqual(new Set([i]));
      }
    });
  });

  describe("daySetToBitmask", () => {
    it("returns 0 for an empty set", () => {
      expect(daySetToBitmask(new Set())).toBe(0);
    });

    it("returns 31 for Monday through Friday", () => {
      expect(daySetToBitmask(new Set([0, 1, 2, 3, 4]))).toBe(31);
    });

    it("returns 127 for all seven days", () => {
      expect(daySetToBitmask(new Set([0, 1, 2, 3, 4, 5, 6]))).toBe(127);
    });

    it("returns 1 for Monday only", () => {
      expect(daySetToBitmask(new Set([0]))).toBe(1);
    });

    it("returns 64 for Sunday only", () => {
      expect(daySetToBitmask(new Set([6]))).toBe(64);
    });
  });

  describe("bitmaskToDaySet and daySetToBitmask roundtrip", () => {
    it.each([0, 1, 31, 64, 96, 127, 42])(
      "roundtrips correctly for bitmask %i",
      (bitmask) => {
        const daySet = bitmaskToDaySet(bitmask);
        const result = daySetToBitmask(daySet);
        expect(result).toBe(bitmask);
      }
    );

    it("roundtrips from daySet to bitmask and back", () => {
      const original = new Set([1, 3, 5]);
      const bitmask = daySetToBitmask(original);
      const result = bitmaskToDaySet(bitmask);
      expect(result).toEqual(original);
    });
  });
});
