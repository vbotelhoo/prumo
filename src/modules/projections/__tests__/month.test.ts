import { describe, it, expect } from "vitest";
import {
  parseMonthParam,
  getCurrentMonth,
  previousMonth,
  nextMonth,
  formatMonthLabel,
} from "../domain/month";

describe("month domain", () => {
  describe("parseMonthParam", () => {
    it("accepts valid month in YYYY-MM format", () => {
      const result = parseMonthParam("2026-07");
      expect(result).toBe("2026-07");
    });

    it("accepts valid month at range boundaries", () => {
      expect(parseMonthParam("2000-01")).toBe("2000-01");
      expect(parseMonthParam("2100-12")).toBe("2100-12");
    });

    it("rejects month outside range (< 2000)", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const result = parseMonthParam("1999-12", now);
      expect(result).toBe(getCurrentMonth(now));
    });

    it("rejects month outside range (> 2100)", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const result = parseMonthParam("2101-01", now);
      expect(result).toBe(getCurrentMonth(now));
    });

    it("rejects invalid format (no leading zero)", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const result = parseMonthParam("2026-7", now);
      expect(result).toBe(getCurrentMonth(now));
    });

    it("rejects invalid month number", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const result = parseMonthParam("2026-13", now);
      expect(result).toBe(getCurrentMonth(now));
    });

    it("rejects invalid month 00", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const result = parseMonthParam("2026-00", now);
      expect(result).toBe(getCurrentMonth(now));
    });

    it("falls back to current month when undefined", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const result = parseMonthParam(undefined, now);
      expect(result).toBe("2026-07");
    });

    it("falls back to current month on non-string", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const result = parseMonthParam("abc" as any, now);
      expect(result).toBe(getCurrentMonth(now));
    });
  });

  describe("getCurrentMonth", () => {
    it("returns current month in YYYY-MM format (UTC)", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      expect(getCurrentMonth(now)).toBe("2026-07");
    });

    it("uses first day of month in result (ignores day/time)", () => {
      const now = new Date("2026-12-31T23:59:59Z");
      expect(getCurrentMonth(now)).toBe("2026-12");
    });

    it("defaults to today when no argument", () => {
      const result = getCurrentMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe("previousMonth", () => {
    it("decrements month within year", () => {
      expect(previousMonth("2026-07")).toBe("2026-06");
      expect(previousMonth("2026-02")).toBe("2026-01");
    });

    it("wraps to December when going back from January", () => {
      expect(previousMonth("2026-01")).toBe("2025-12");
    });

    it("handles leap year month correctly", () => {
      expect(previousMonth("2026-03")).toBe("2026-02");
    });

    it("works at range boundaries", () => {
      expect(previousMonth("2000-01")).toBe("1999-12");
      expect(previousMonth("2100-12")).toBe("2100-11");
    });
  });

  describe("nextMonth", () => {
    it("increments month within year", () => {
      expect(nextMonth("2026-07")).toBe("2026-08");
      expect(nextMonth("2026-11")).toBe("2026-12");
    });

    it("wraps to January when going forward from December", () => {
      expect(nextMonth("2026-12")).toBe("2027-01");
    });

    it("handles leap year transitions", () => {
      expect(nextMonth("2026-01")).toBe("2026-02");
    });

    it("works at range boundaries", () => {
      expect(nextMonth("2000-01")).toBe("2000-02");
      expect(nextMonth("2100-12")).toBe("2101-01");
    });
  });

  describe("formatMonthLabel", () => {
    it("returns month name and year in pt-BR", () => {
      // Use a fixed date to avoid locale/timezone issues
      const result = formatMonthLabel("2026-07");
      expect(result).toMatch(/julho de 2026/i);
    });

    it("formats various months correctly", () => {
      expect(formatMonthLabel("2026-01")).toMatch(/janeiro/i);
      expect(formatMonthLabel("2026-12")).toMatch(/dezembro/i);
      expect(formatMonthLabel("2026-06")).toMatch(/junho/i);
    });

    it("formats year correctly", () => {
      expect(formatMonthLabel("2025-05")).toMatch(/2025/);
      expect(formatMonthLabel("2027-11")).toMatch(/2027/);
    });
  });
});
