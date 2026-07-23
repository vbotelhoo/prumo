import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, money } from "@/shared";
import {
  listCommitmentsByUser,
  getCommitmentForUser,
  createCommitmentWithInstallments,
  setInstallmentStatus,
  deleteCommitment,
  sumInstallmentsByMonth,
  getMonthlyInstallmentsByCategory,
  listUnpaidInstallmentsForMonth,
} from "../data/commitments-repository";
import { materializeInstallments } from "../domain/installments";
import { INSTALLMENT_NOT_FOUND_ERROR } from "../domain/constants";

describe("commitments-repository (integration)", () => {
  const testUserId = "test-user-123";
  const otherUserId = "other-user-456";
  let testCategoryId = "";
  let testCategoryId2 = "";

  beforeAll(async () => {
    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Test User",
        email: "test@example.com",
        cpf: "12345678901",
        birthDate: "1990-01-01",
        zipCode: "12345000",
        street: "Rua Test",
        addressNumber: "123",
        neighborhood: "Bairro",
        city: "Cidade",
        state: "SP",
        termsAcceptedAt: new Date().toISOString(),
      },
    });

    // Create other user
    await prisma.user.create({
      data: {
        id: otherUserId,
        name: "Other User",
        email: "other@example.com",
        cpf: "98765432101",
        birthDate: "1991-02-02",
        zipCode: "54321000",
        street: "Rua Other",
        addressNumber: "456",
        neighborhood: "Outro Bairro",
        city: "Outra Cidade",
        state: "RJ",
        termsAcceptedAt: new Date().toISOString(),
      },
    });

    // Create test categories
    const cat1 = await prisma.category.create({
      data: {
        name: "Eletrônicos",
        type: "saida",
        userId: testUserId,
      },
    });
    testCategoryId = cat1.id;

    const cat2 = await prisma.category.create({
      data: {
        name: "Alimentação",
        type: "saida",
        userId: testUserId,
      },
    });
    testCategoryId2 = cat2.id;
  });

  afterAll(async () => {
    // Clean up test data scoped to this suite's users (order matters:
    // installments → commitments → sessions → categories → users)
    const userIds = [testUserId, otherUserId];
    await prisma.installment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.commitment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.category.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  beforeEach(async () => {
    // Clear commitments before each test
    await prisma.installment.deleteMany({ where: { userId: testUserId } });
    await prisma.commitment.deleteMany({ where: { userId: testUserId } });
  });

  describe("createCommitmentWithInstallments", () => {
    it("should create commitment and installments atomically", async () => {
      const total = 30000; // R$ 300,00
      const installments = materializeInstallments(
        money(total),
        3,
        "2026-08-15",
        "installment_payment"
      );

      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total,
        installmentCount: 3,
        firstDueDate: "2026-08-15",
        description: "Notebook",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: installments.map((inst) => ({
          number: inst.number,
          amount: inst.amount as unknown as number,
          dueDate: inst.dueDate,
          status: inst.status,
        })),
      });

      expect(commitment.id).toBeDefined();
      expect(commitment.mode).toBe("installment_payment");
      expect(commitment.total).toBe(money(total));
      expect(commitment.description).toBe("Notebook");
      expect(commitment.installments!).toHaveLength(3);
      expect(commitment.installments![0].amount).toBe(money(10000));
    });

    it("should create fixed_payment commitment", async () => {
      const installmentValue = 1200; // R$ 12,00
      const count = 48;
      const total = installmentValue * count;

      const commitment = await createCommitmentWithInstallments({
        mode: "fixed_payment",
        total,
        installmentCount: count,
        firstDueDate: "2026-09-05",
        description: "Carro",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: Array.from({ length: count }, (_, i) => ({
          number: i + 1,
          amount: installmentValue,
          dueDate: new Date(2026, 8 + Math.floor((i + 1) / 12), 5).toISOString().split("T")[0],
          status: "prevista" as const,
        })),
      });

      expect(commitment.installmentCount).toBe(count);
      expect(commitment.installments!).toHaveLength(count);
      expect(commitment.installments!.every((inst) => inst.amount === money(installmentValue))).toBe(true);
    });
  });

  describe("listCommitmentsByUser", () => {
    it("should list user commitments only (AD-012)", async () => {
      // Create commitment for testUser
      const commitment1 = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 2,
        firstDueDate: "2026-08-01",
        description: "Compra 1",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 5000, dueDate: "2026-08-01", status: "prevista" },
          { number: 2, amount: 5000, dueDate: "2026-09-01", status: "prevista" },
        ],
      });

      // Create commitment for otherUser
      const otherCategory = await prisma.category.create({
        data: {
          name: "Autre Catégorie",
          type: "saida",
          userId: otherUserId,
        },
      });

      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 20000,
        installmentCount: 2,
        firstDueDate: "2026-08-01",
        description: "Other's Purchase",
        categoryId: otherCategory.id,
        userId: otherUserId,
        installments: [
          { number: 1, amount: 10000, dueDate: "2026-08-01", status: "prevista" },
          { number: 2, amount: 10000, dueDate: "2026-09-01", status: "prevista" },
        ],
      });

      const commitments = await listCommitmentsByUser(testUserId);
      expect(commitments).toHaveLength(1);
      expect(commitments[0].id).toBe(commitment1.id);
      expect(commitments[0].description).toBe("Compra 1");
    });
  });

  describe("getCommitmentForUser", () => {
    it("should get commitment for user", async () => {
      const created = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 15000,
        installmentCount: 3,
        firstDueDate: "2026-08-15",
        description: "Test Commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 5000, dueDate: "2026-08-15", status: "prevista" },
          { number: 2, amount: 5000, dueDate: "2026-09-15", status: "prevista" },
          { number: 3, amount: 5000, dueDate: "2026-10-15", status: "prevista" },
        ],
      });

      const commitment = await getCommitmentForUser(created.id, testUserId);
      expect(commitment.id).toBe(created.id);
      expect(commitment.description).toBe("Test Commitment");
    });

    it("should reject access to another user's commitment (AD-012)", async () => {
      const created = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 2,
        firstDueDate: "2026-08-01",
        description: "User A Commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 5000, dueDate: "2026-08-01", status: "prevista" },
          { number: 2, amount: 5000, dueDate: "2026-09-01", status: "prevista" },
        ],
      });

      await expect(getCommitmentForUser(created.id, otherUserId)).rejects.toThrow(
        "não encontrado"
      );
    });
  });

  describe("setInstallmentStatus", () => {
    it("should toggle installment status", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 2,
        firstDueDate: "2026-08-01",
        description: "Test",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 5000, dueDate: "2026-08-01", status: "prevista" },
          { number: 2, amount: 5000, dueDate: "2026-09-01", status: "prevista" },
        ],
      });

      const instId = commitment.installments![0].id;

      // Mark as paid
      let updated = await setInstallmentStatus(instId, testUserId, "paga");
      expect(updated.status).toBe("paga");

      // Mark as prevista again
      updated = await setInstallmentStatus(instId, testUserId, "prevista");
      expect(updated.status).toBe("prevista");
    });

    it("should reject access to another user's installment", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 2,
        firstDueDate: "2026-08-01",
        description: "Test",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 5000, dueDate: "2026-08-01", status: "prevista" },
          { number: 2, amount: 5000, dueDate: "2026-09-01", status: "prevista" },
        ],
      });

      const instId = commitment.installments![0].id;

      await expect(setInstallmentStatus(instId, otherUserId, "paga")).rejects.toThrow(
        INSTALLMENT_NOT_FOUND_ERROR
      );
    });
  });

  describe("deleteCommitment", () => {
    it("should delete commitment with no paid installments", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 2,
        firstDueDate: "2026-08-01",
        description: "Test Delete",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 5000, dueDate: "2026-08-01", status: "prevista" },
          { number: 2, amount: 5000, dueDate: "2026-09-01", status: "prevista" },
        ],
      });

      await deleteCommitment(commitment.id, testUserId);

      const after = await prisma.commitment.findUnique({
        where: { id: commitment.id },
      });
      expect(after).toBeNull();
    });

    it("should preserve paid installments on delete", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 3,
        firstDueDate: "2026-08-01",
        description: "Test Preserve",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 3333, dueDate: "2026-08-01", status: "paga" },
          { number: 2, amount: 3333, dueDate: "2026-09-01", status: "prevista" },
          { number: 3, amount: 3334, dueDate: "2026-10-01", status: "prevista" },
        ],
      });

      await deleteCommitment(commitment.id, testUserId);

      // Commitment should still exist (has paid installment)
      const remaining = await prisma.commitment.findUnique({
        where: { id: commitment.id },
        include: { installments: true },
      });
      expect(remaining).not.toBeNull();
      expect(remaining!.installments).toHaveLength(1);
      expect(remaining!.installments[0].status).toBe("paga");
    });
  });

  describe("sumInstallmentsByMonth", () => {
    it("sums prevista and paga installments together in a month", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 30000, // R$ 300
        installmentCount: 3,
        firstDueDate: "2026-07-10",
        description: "Test commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 10000, dueDate: "2026-07-10", status: "prevista" },
          { number: 2, amount: 10000, dueDate: "2026-07-20", status: "paga" },
          { number: 3, amount: 10000, dueDate: "2026-08-10", status: "prevista" },
        ],
      });

      const result = await sumInstallmentsByMonth(testUserId, "2026-07");

      // Only July installments (1 + 2), regardless of status
      expect(result).toBe(money(20000));
    });

    it("includes installments on first day of month", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 1,
        firstDueDate: "2026-07-01",
        description: "Test commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 10000, dueDate: "2026-07-01", status: "prevista" }],
      });

      const result = await sumInstallmentsByMonth(testUserId, "2026-07");

      expect(result).toBe(money(10000));
    });

    it("includes installments on last day of month", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 15000,
        installmentCount: 1,
        firstDueDate: "2026-07-31",
        description: "Test commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 15000, dueDate: "2026-07-31", status: "paga" }],
      });

      const result = await sumInstallmentsByMonth(testUserId, "2026-07");

      expect(result).toBe(money(15000));
    });

    it("excludes installments from other months", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 30000,
        installmentCount: 3,
        firstDueDate: "2026-06-10",
        description: "Test commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 10000, dueDate: "2026-06-10", status: "paga" },
          { number: 2, amount: 10000, dueDate: "2026-07-10", status: "prevista" },
          { number: 3, amount: 10000, dueDate: "2026-08-10", status: "paga" },
        ],
      });

      const result = await sumInstallmentsByMonth(testUserId, "2026-07");

      expect(result).toBe(money(10000)); // Only July (installment 2)
    });

    it("returns Money(0) for month with no installments", async () => {
      const result = await sumInstallmentsByMonth(testUserId, "2026-09");

      expect(result).toBe(money(0));
    });

    it("isolates aggregates between two users", async () => {
      const commitmentA = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 1,
        firstDueDate: "2026-07-10",
        description: "User A commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 10000, dueDate: "2026-07-10", status: "prevista" }],
      });

      const commitmentB = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 20000,
        installmentCount: 1,
        firstDueDate: "2026-07-15",
        description: "User B commitment",
        categoryId: testCategoryId,
        userId: otherUserId,
        installments: [{ number: 1, amount: 20000, dueDate: "2026-07-15", status: "paga" }],
      });

      const resultA = await sumInstallmentsByMonth(testUserId, "2026-07");
      const resultB = await sumInstallmentsByMonth(otherUserId, "2026-07");

      expect(resultA).toBe(money(10000));
      expect(resultB).toBe(money(20000));
    });
  });

  describe("getMonthlyInstallmentsByCategory", () => {
    beforeEach(async () => {
      // Testes de isolamento deste describe usam otherUserId; a limpeza
      // global só cobre testUserId, então garantimos aqui que otherUserId
      // também começa sem parcelas/compromissos de outros describes.
      await prisma.installment.deleteMany({ where: { userId: otherUserId } });
      await prisma.commitment.deleteMany({ where: { userId: otherUserId } });
    });

    it("returns empty array for a month with no installments", async () => {
      const result = await getMonthlyInstallmentsByCategory(testUserId, "2026-07");

      expect(result).toEqual([]);
    });

    it("omits a category with no installments in the month (DASH-05)", async () => {
      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 1,
        firstDueDate: "2026-08-10", // outro mês — não conta para 2026-07
        description: "Compra em agosto",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 10000, dueDate: "2026-08-10", status: "prevista" }],
      });

      const result = await getMonthlyInstallmentsByCategory(testUserId, "2026-07");

      expect(result).toEqual([]);
      expect(result.some((slice) => slice.categoryId === testCategoryId)).toBe(false);
    });

    it("sums paga and prevista installments together in the same category", async () => {
      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 20000,
        installmentCount: 2,
        firstDueDate: "2026-07-10",
        description: "Compra parcelada",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 10000, dueDate: "2026-07-10", status: "prevista" },
          { number: 2, amount: 10000, dueDate: "2026-07-20", status: "paga" },
        ],
      });

      const result = await getMonthlyInstallmentsByCategory(testUserId, "2026-07");

      expect(result).toEqual([
        { categoryId: testCategoryId, categoryName: "Eletrônicos", total: money(20000) },
      ]);
    });

    it("treats fixed_payment the same as installment_payment (DASH-17)", async () => {
      await createCommitmentWithInstallments({
        mode: "fixed_payment",
        total: 15000,
        installmentCount: 1,
        firstDueDate: "2026-07-05",
        description: "Aluguel",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 15000, dueDate: "2026-07-05", status: "prevista" }],
      });

      const result = await getMonthlyInstallmentsByCategory(testUserId, "2026-07");

      expect(result).toEqual([
        { categoryId: testCategoryId, categoryName: "Eletrônicos", total: money(15000) },
      ]);
    });

    it("returns 2 entries for 2 different categories", async () => {
      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 1,
        firstDueDate: "2026-07-10",
        description: "Compra A",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 10000, dueDate: "2026-07-10", status: "prevista" }],
      });

      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 7000,
        installmentCount: 1,
        firstDueDate: "2026-07-12",
        description: "Compra B",
        categoryId: testCategoryId2,
        userId: testUserId,
        installments: [{ number: 1, amount: 7000, dueDate: "2026-07-12", status: "prevista" }],
      });

      const result = await getMonthlyInstallmentsByCategory(testUserId, "2026-07");

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { categoryId: testCategoryId, categoryName: "Eletrônicos", total: money(10000) },
          { categoryId: testCategoryId2, categoryName: "Alimentação", total: money(7000) },
        ])
      );
    });

    it("does not leak installments from another user", async () => {
      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 1,
        firstDueDate: "2026-07-10",
        description: "User A commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 10000, dueDate: "2026-07-10", status: "prevista" }],
      });

      const otherCategory = await prisma.category.create({
        data: { name: "Categoria de Outro", type: "saida", userId: otherUserId },
      });

      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 30000,
        installmentCount: 1,
        firstDueDate: "2026-07-10",
        description: "User B commitment",
        categoryId: otherCategory.id,
        userId: otherUserId,
        installments: [{ number: 1, amount: 30000, dueDate: "2026-07-10", status: "prevista" }],
      });

      const resultA = await getMonthlyInstallmentsByCategory(testUserId, "2026-07");
      const resultB = await getMonthlyInstallmentsByCategory(otherUserId, "2026-07");

      expect(resultA).toEqual([
        { categoryId: testCategoryId, categoryName: "Eletrônicos", total: money(10000) },
      ]);
      expect(resultB).toEqual([
        { categoryId: otherCategory.id, categoryName: "Categoria de Outro", total: money(30000) },
      ]);

      await prisma.installment.deleteMany({ where: { userId: otherUserId } });
      await prisma.commitment.deleteMany({ where: { userId: otherUserId } });
      await prisma.category.delete({ where: { id: otherCategory.id } });
    });
  });

  describe("listUnpaidInstallmentsForMonth", () => {
    beforeEach(async () => {
      // Mesma razão do describe anterior: isola otherUserId entre testes
      // deste describe (limpeza global só cobre testUserId).
      await prisma.installment.deleteMany({ where: { userId: otherUserId } });
      await prisma.commitment.deleteMany({ where: { userId: otherUserId } });
    });

    it("returns empty array for a month with no prevista installments", async () => {
      const result = await listUnpaidInstallmentsForMonth(testUserId, "2026-07");

      expect(result).toEqual([]);
    });

    it("includes fixed_payment installments the same as installment_payment (DASH-17)", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "fixed_payment",
        total: 15000,
        installmentCount: 1,
        firstDueDate: "2026-07-05",
        description: "Aluguel",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 15000, dueDate: "2026-07-05", status: "prevista" }],
      });

      const result = await listUnpaidInstallmentsForMonth(testUserId, "2026-07");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        installmentId: commitment.installments![0]!.id,
        commitmentId: commitment.id,
        description: "Aluguel",
        categoryName: "Eletrônicos",
        amount: money(15000),
        dueDate: "2026-07-05",
      });
    });

    it("excludes paga installments", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 20000,
        installmentCount: 2,
        firstDueDate: "2026-07-10",
        description: "Compra parcelada",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 10000, dueDate: "2026-07-10", status: "prevista" },
          { number: 2, amount: 10000, dueDate: "2026-07-20", status: "paga" },
        ],
      });

      const result = await listUnpaidInstallmentsForMonth(testUserId, "2026-07");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        installmentId: commitment.installments![0]!.id,
        commitmentId: commitment.id,
        description: "Compra parcelada",
        categoryName: "Eletrônicos",
        amount: money(10000),
        dueDate: "2026-07-10",
      });
    });

    it("orders results by dueDate ascending", async () => {
      const commitment = await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 30000,
        installmentCount: 3,
        firstDueDate: "2026-07-20",
        description: "Compra parcelada",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [
          { number: 1, amount: 10000, dueDate: "2026-07-20", status: "prevista" },
          { number: 2, amount: 10000, dueDate: "2026-07-05", status: "prevista" },
          { number: 3, amount: 10000, dueDate: "2026-07-15", status: "prevista" },
        ],
      });

      const result = await listUnpaidInstallmentsForMonth(testUserId, "2026-07");

      expect(result.map((i) => i.dueDate)).toEqual(["2026-07-05", "2026-07-15", "2026-07-20"]);
      expect(result.map((i) => i.commitmentId)).toEqual([
        commitment.id,
        commitment.id,
        commitment.id,
      ]);
    });

    it("does not leak installments from another user", async () => {
      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 10000,
        installmentCount: 1,
        firstDueDate: "2026-07-10",
        description: "User A commitment",
        categoryId: testCategoryId,
        userId: testUserId,
        installments: [{ number: 1, amount: 10000, dueDate: "2026-07-10", status: "prevista" }],
      });

      const otherCategory = await prisma.category.create({
        data: { name: "Categoria de Outro", type: "saida", userId: otherUserId },
      });

      await createCommitmentWithInstallments({
        mode: "installment_payment",
        total: 30000,
        installmentCount: 1,
        firstDueDate: "2026-07-10",
        description: "User B commitment",
        categoryId: otherCategory.id,
        userId: otherUserId,
        installments: [{ number: 1, amount: 30000, dueDate: "2026-07-10", status: "prevista" }],
      });

      const resultA = await listUnpaidInstallmentsForMonth(testUserId, "2026-07");
      const resultB = await listUnpaidInstallmentsForMonth(otherUserId, "2026-07");

      expect(resultA).toHaveLength(1);
      expect(resultA[0]!.description).toBe("User A commitment");
      expect(resultB).toHaveLength(1);
      expect(resultB[0]!.description).toBe("User B commitment");

      await prisma.installment.deleteMany({ where: { userId: otherUserId } });
      await prisma.commitment.deleteMany({ where: { userId: otherUserId } });
      await prisma.category.delete({ where: { id: otherCategory.id } });
    });
  });
});
