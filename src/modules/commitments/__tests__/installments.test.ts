import { describe, it, expect } from "vitest";
import {
  splitInstallments,
  scheduleDueDates,
  materializeInstallments,
  regeneratePrevistaInstallments,
  computeCommitmentProgress,
} from "../domain/installments";
import type { Installment } from "../domain/types";
import { money } from "@/shared";
import { INSTALLMENT_VALUE_TOO_SMALL_ERROR } from "../domain/constants";

describe("splitInstallments", () => {
  it("should split equally when divisible", () => {
    const amounts = splitInstallments(money(30000), 3); // R$ 300,00 / 3
    expect(amounts).toEqual([10000, 10000, 10000]);
  });

  it("should distribute remainder to first installment (AD-009 invariant)", () => {
    const amounts = splitInstallments(money(10000), 3); // R$ 100,00 / 3 = 33,34 + 33,33 + 33,33
    expect(amounts[0]).toBe(3334); // 33,34
    expect(amounts[1]).toBe(3333); // 33,33
    expect(amounts[2]).toBe(3333); // 33,33
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(10000); // sum == total (invariant)
  });

  it("should satisfy invariant: sum always equals total", () => {
    const testCases = [
      { total: 123456, count: 7 },
      { total: 100, count: 3 },
      { total: 1000000, count: 360 },
    ];

    testCases.forEach(({ total, count }) => {
      const amounts = splitInstallments(money(total), count);
      const sum = amounts.reduce((a, b) => a + b, 0);
      expect(sum).toBe(total);
    });
  });

  it("should reject when minimum installment would be < R$ 0,01", () => {
    expect(() => splitInstallments(money(10), 20)).toThrow(INSTALLMENT_VALUE_TOO_SMALL_ERROR);
  });

  it("should reject count < 2", () => {
    expect(() => splitInstallments(money(10000), 1)).toThrow();
  });
});

describe("scheduleDueDates", () => {
  it("should generate monthly due dates", () => {
    const dates = scheduleDueDates("2026-08-15", 3);
    expect(dates).toEqual(["2026-08-15", "2026-09-15", "2026-10-15"]);
  });

  it("should clamp to last day of month when day doesn't exist (AD-009 edge case)", () => {
    // 31st Jan → 28th Feb (non-leap year)
    const dates = scheduleDueDates("2026-01-31", 2);
    expect(dates[0]).toBe("2026-01-31");
    expect(dates[1]).toBe("2026-02-28");
  });

  it("should handle leap years correctly", () => {
    // 31st Jan → 29th Feb (leap year)
    const dates = scheduleDueDates("2024-01-31", 2);
    expect(dates[0]).toBe("2024-01-31");
    expect(dates[1]).toBe("2024-02-29");
  });

  it("should handle year boundary", () => {
    const dates = scheduleDueDates("2026-11-30", 3);
    expect(dates).toEqual(["2026-11-30", "2026-12-30", "2027-01-30"]);
  });

  it("should handle 30th of month → Feb clamping", () => {
    const dates = scheduleDueDates("2026-03-30", 2);
    expect(dates[0]).toBe("2026-03-30");
    expect(dates[1]).toBe("2026-04-30"); // April has 30 days
  });
});

describe("materializeInstallments", () => {
  it("should materialize installment_payment mode (split amounts)", () => {
    const installments = materializeInstallments(money(10000), 3, "2026-08-15", "installment_payment");
    expect(installments).toHaveLength(3);
    expect(installments[0].amount).toBe(3334); // remainder in first
    expect(installments[0].status).toBe("prevista");
    expect(installments[0].number).toBe(1);
    expect(installments[0].dueDate).toBe("2026-08-15");
  });

  it("should materialize fixed_payment mode (equal amounts)", () => {
    const total = money(57600); // R$ 576,00
    const count = 48; // 48 × R$ 12,00
    const installments = materializeInstallments(total, count, "2026-09-05", "fixed_payment");
    expect(installments).toHaveLength(48);
    installments.forEach((inst) => {
      expect(inst.amount).toBe(1200); // R$ 12,00 each
      expect(inst.status).toBe("prevista");
    });
    const sum = installments.reduce((a, b) => a + b.amount, 0);
    expect(sum).toBe(total);
  });
});

describe("regeneratePrevistaInstallments", () => {
  it("should regenerate all prevista when scope='todas'", () => {
    const existing: Installment[] = [
      {
        id: "1",
        number: 1,
        amount: money(3334),
        dueDate: "2026-08-15",
        status: "paga",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        number: 2,
        amount: money(3333),
        dueDate: "2026-09-15",
        status: "prevista",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        number: 3,
        amount: money(3333),
        dueDate: "2026-10-15",
        status: "prevista",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = regeneratePrevistaInstallments(money(12000), 3, "2026-08-15", existing, "todas");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.regenerated).toHaveLength(2); // 3 total - 1 paid
      const sum = result.regenerated.reduce((a, b) => a + b.amount, 0) + 3334;
      expect(sum).toBe(12000); // 1 paid + regenerated = new total
    }
  });

  it("should reject new total < sum of paid", () => {
    const existing: Installment[] = [
      {
        id: "1",
        number: 1,
        amount: money(5000),
        dueDate: "2026-08-15",
        status: "paga",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        number: 2,
        amount: money(5000),
        dueDate: "2026-09-15",
        status: "prevista",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = regeneratePrevistaInstallments(money(8000), 2, "2026-08-15", existing, "todas");
    expect(result.success).toBe(false);
  });

  it("should reject new count < number of paid", () => {
    const existing: Installment[] = [
      {
        id: "1",
        number: 1,
        amount: money(5000),
        dueDate: "2026-08-15",
        status: "paga",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        number: 2,
        amount: money(5000),
        dueDate: "2026-09-15",
        status: "paga",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = regeneratePrevistaInstallments(money(15000), 1, "2026-08-15", existing, "todas");
    expect(result.success).toBe(false);
  });
});

describe("computeCommitmentProgress", () => {
  it("should compute progress correctly", () => {
    const installments: Installment[] = [
      {
        id: "1",
        number: 1,
        amount: money(2500),
        dueDate: "2026-08-15",
        status: "paga",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        number: 2,
        amount: money(2500),
        dueDate: "2026-09-15",
        status: "paga",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        number: 3,
        amount: money(2500),
        dueDate: "2026-10-15",
        status: "prevista",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "4",
        number: 4,
        amount: money(2500),
        dueDate: "2026-11-15",
        status: "prevista",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const progress = computeCommitmentProgress(installments);
    expect(progress.paidCount).toBe(2);
    expect(progress.totalCount).toBe(4);
    expect(progress.amountPaid).toBe(5000);
    expect(progress.amountRemaining).toBe(5000);
    expect(progress.percentPaid).toBe(50);
    expect(progress.isSettled).toBe(false);
  });

  it("should compute 100% when all paid", () => {
    const installments: Installment[] = [
      {
        id: "1",
        number: 1,
        amount: money(10000),
        dueDate: "2026-08-15",
        status: "paga",
        commitmentId: "c1",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const progress = computeCommitmentProgress(installments);
    expect(progress.percentPaid).toBe(100);
    expect(progress.isSettled).toBe(true);
  });
});
