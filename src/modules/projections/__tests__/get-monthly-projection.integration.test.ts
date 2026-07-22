import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, money } from "@/shared";
import { getMonthlyProjection } from "../services/get-monthly-projection";
import { createTransaction } from "@/modules/transactions/data/transactions-repository";
import { createCommitmentWithInstallments } from "@/modules/commitments/data/commitments-repository";

describe("getMonthlyProjection (integration)", () => {
  const testUserId = "test-user-projections";
  const otherUserId = "other-user-projections";
  let testCategoryIdIn = "";
  let testCategoryIdOut = "";

  beforeAll(async () => {
    // Create test users
    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Test User",
        email: "test-proj@example.com",
        cpf: "11111111111",
        birthDate: "1990-01-01",
        zipCode: "01310100",
        street: "Test Street",
        addressNumber: "123",
        neighborhood: "Test",
        city: "Test City",
        state: "SP",
        termsAcceptedAt: new Date().toISOString(),
      },
    });

    await prisma.user.create({
      data: {
        id: otherUserId,
        name: "Other User",
        email: "other-proj@example.com",
        cpf: "22222222222",
        birthDate: "1991-02-02",
        zipCode: "54321000",
        street: "Other Street",
        addressNumber: "456",
        neighborhood: "Other",
        city: "Other City",
        state: "RJ",
        termsAcceptedAt: new Date().toISOString(),
      },
    });

    // Create categories
    const catIn = await prisma.category.create({
      data: { name: "Entrada Test", type: "entrada", userId: testUserId },
    });
    testCategoryIdIn = catIn.id;

    const catOut = await prisma.category.create({
      data: { name: "Saída Test", type: "saida", userId: testUserId },
    });
    testCategoryIdOut = catOut.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.installment.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
    await prisma.commitment.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
    await prisma.transaction.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
    await prisma.category.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testUserId, otherUserId] } } });
  });

  beforeEach(async () => {
    // Clean data before each test
    await prisma.installment.deleteMany({ where: { userId: testUserId } });
    await prisma.commitment.deleteMany({ where: { userId: testUserId } });
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
  });

  it("calculates projection matching manual calculation", async () => {
    // Create: 1 entrada R$ 1000 + 1 saída R$ 300 + 1 parcela de 3x de R$ 200
    await createTransaction({
      type: "entrada",
      date: "2026-07-10",
      amount: 100000, // R$ 1.000
      categoryId: testCategoryIdIn,
      userId: testUserId,
    });

    await createTransaction({
      type: "saida",
      date: "2026-07-15",
      amount: 30000, // R$ 300
      categoryId: testCategoryIdOut,
      userId: testUserId,
    });

    await createCommitmentWithInstallments({
      mode: "installment_payment",
      total: 60000, // R$ 600 total
      installmentCount: 3,
      firstDueDate: "2026-07-20",
      description: "Test commitment",
      categoryId: testCategoryIdOut,
      userId: testUserId,
      installments: [
        { number: 1, amount: 20000, dueDate: "2026-07-20", status: "prevista" },
        { number: 2, amount: 20000, dueDate: "2026-08-20", status: "prevista" },
        { number: 3, amount: 20000, dueDate: "2026-09-20", status: "prevista" },
      ],
    });

    const result = await getMonthlyProjection(testUserId, "2026-07");

    // Manual calculation:
    // entradas = 100000
    // saidas avulsas = 30000
    // parcelas do mês = 20000 (only first)
    // saidasPrevistas = 30000 + 20000 = 50000
    // saldoProjetado = 100000 - 50000 = 50000
    expect(result.entradasPrevistas).toBe(money(100000));
    expect(result.saidasPrevistas).toBe(money(50000));
    expect(result.saldoProjetado).toBe(money(50000));
    expect(result.totalComprometido).toBe(money(20000));
  });

  it("isolates projection between two users in same month", async () => {
    // User 1: R$ 100 entrada
    await createTransaction({
      type: "entrada",
      date: "2026-07-10",
      amount: 10000,
      categoryId: testCategoryIdIn,
      userId: testUserId,
    });

    // User 2: R$ 200 entrada + R$ 150 saída
    const otherCatIn = await prisma.category.create({
      data: { name: "Outra Entrada", type: "entrada", userId: otherUserId },
    });
    const otherCatOut = await prisma.category.create({
      data: { name: "Outra Saída", type: "saida", userId: otherUserId },
    });

    await createTransaction({
      type: "entrada",
      date: "2026-07-10",
      amount: 20000,
      categoryId: otherCatIn.id,
      userId: otherUserId,
    });

    await createTransaction({
      type: "saida",
      date: "2026-07-10",
      amount: 15000,
      categoryId: otherCatOut.id,
      userId: otherUserId,
    });

    const resultA = await getMonthlyProjection(testUserId, "2026-07");
    const resultB = await getMonthlyProjection(otherUserId, "2026-07");

    // User A: entradas=100, saidas=0, saldo=100, comprometido=0
    expect(resultA.entradasPrevistas).toBe(money(10000));
    expect(resultA.saidasPrevistas).toBe(money(0));
    expect(resultA.saldoProjetado).toBe(money(10000));

    // User B: entradas=200, saidas=150, saldo=50, comprometido=0
    expect(resultB.entradasPrevistas).toBe(money(20000));
    expect(resultB.saidasPrevistas).toBe(money(15000));
    expect(resultB.saldoProjetado).toBe(money(5000));
  });

  it("returns all zeros for month with no data", async () => {
    const result = await getMonthlyProjection(testUserId, "2026-10");

    expect(result.entradasPrevistas).toBe(money(0));
    expect(result.saidasPrevistas).toBe(money(0));
    expect(result.saldoProjetado).toBe(money(0));
    expect(result.totalComprometido).toBe(money(0));
  });
});
