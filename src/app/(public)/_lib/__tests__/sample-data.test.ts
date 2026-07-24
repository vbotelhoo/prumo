import { describe, expect, it } from "vitest";
import { SAMPLE_INSTALLMENT_PLAN, SAMPLE_MONTH_PROJECTIONS } from "../sample-data";

describe("SAMPLE_INSTALLMENT_PLAN", () => {
  // LAND-05: sum of all installments equals the total value
  it("sum of installments equals totalCents exactly", () => {
    const sum = SAMPLE_INSTALLMENT_PLAN.installmentsCents.reduce((acc, val) => acc + val, 0);
    expect(sum).toBe(SAMPLE_INSTALLMENT_PLAN.totalCents);
  });

  // LAND-05: all values are integers (centavos — no fractions)
  it("all installment values are integers", () => {
    SAMPLE_INSTALLMENT_PLAN.installmentsCents.forEach((installment) => {
      expect(Number.isInteger(installment)).toBe(true);
    });
  });

  it("total value is an integer", () => {
    expect(Number.isInteger(SAMPLE_INSTALLMENT_PLAN.totalCents)).toBe(true);
  });

  it("description is a non-empty string", () => {
    expect(typeof SAMPLE_INSTALLMENT_PLAN.description).toBe("string");
    expect(SAMPLE_INSTALLMENT_PLAN.description.length).toBeGreaterThan(0);
  });

  it("paidCount is a non-negative integer", () => {
    expect(Number.isInteger(SAMPLE_INSTALLMENT_PLAN.paidCount)).toBe(true);
    expect(SAMPLE_INSTALLMENT_PLAN.paidCount).toBeGreaterThanOrEqual(0);
  });

  it("paidCount does not exceed number of installments", () => {
    expect(SAMPLE_INSTALLMENT_PLAN.paidCount).toBeLessThanOrEqual(
      SAMPLE_INSTALLMENT_PLAN.installmentsCents.length
    );
  });
});

describe("SAMPLE_MONTH_PROJECTIONS", () => {
  // LAND-05: balance = income - expenses
  SAMPLE_MONTH_PROJECTIONS.forEach((projection) => {
    it(`month "${projection.monthLabel}": balance = income - expenses`, () => {
      const expectedBalance = projection.incomeCents - projection.expensesCents;
      expect(projection.projectedBalanceCents).toBe(expectedBalance);
    });
  });

  // LAND-05: all values are integers
  SAMPLE_MONTH_PROJECTIONS.forEach((projection) => {
    it(`month "${projection.monthLabel}": all values are integers`, () => {
      expect(Number.isInteger(projection.incomeCents)).toBe(true);
      expect(Number.isInteger(projection.expensesCents)).toBe(true);
      expect(Number.isInteger(projection.projectedBalanceCents)).toBe(true);
    });
  });

  it("all month labels are non-empty strings", () => {
    SAMPLE_MONTH_PROJECTIONS.forEach((projection) => {
      expect(typeof projection.monthLabel).toBe("string");
      expect(projection.monthLabel.length).toBeGreaterThan(0);
    });
  });
});
