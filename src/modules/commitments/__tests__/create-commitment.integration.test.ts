import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, money } from "@/shared";
import { createCommitmentCore } from "../actions/create-commitment-core";

describe("create-commitment (integration)", () => {
  const testUserId = "test-create-commit-123";
  const testEmail = "test-create@example.com";
  let testCategoryId = "";
  let mockHeaders: Map<string, string>;

  beforeAll(async () => {
    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Test User",
        email: testEmail,
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

    // Create test category
    const category = await prisma.category.create({
      data: {
        name: "Eletrônicos",
        type: "saida",
        userId: testUserId,
      },
    });
    testCategoryId = category.id;

    // Create session for the test user
    const session = await prisma.session.create({
      data: {
        token: "test-token-commitment",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        userId: testUserId,
      },
    });

    // Mock headers with session token
    mockHeaders = new Map();
    mockHeaders.set("cookie", `auth.callback_url=http://localhost; auth_session=${session.token}`);
  });

  afterAll(async () => {
    // Clean up test data (order matters)
    try {
      await prisma.installment.deleteMany({});
      await prisma.commitment.deleteMany({});
      await prisma.session.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.user.deleteMany({});
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clear all test data before each test
    try {
      await prisma.installment.deleteMany({});
      await prisma.commitment.deleteMany({});
      await prisma.session.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.user.deleteMany({});
    } catch {
      // Ignore if tables are empty
    }
  });

  describe("create parcelada", () => {
    it("should create installment_payment commitment with correct arredondamento", async () => {
      const result = await createCommitmentCore(
        {
          mode: "installment_payment",
          total: "100,00", // R$ 100,00
          installmentCount: 3,
          firstDueDate: "2026-08-15",
          description: "Notebook",
          categoryId: testCategoryId,
        },
        mockHeaders
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok=true");

      const commitment = result.commitment;
      expect(commitment.mode).toBe("installment_payment");
      expect(commitment.total).toBe(money(10000)); // R$ 100,00 in cents
      expect(commitment.installmentCount).toBe(3);
      expect(commitment.description).toBe("Notebook");

      // Verify arredondamento: 33,34 + 33,33 + 33,33 = 100,00
      expect(commitment.installments).toHaveLength(3);
      expect(commitment.installments[0].amount).toBe(money(3334)); // 33,34
      expect(commitment.installments[1].amount).toBe(money(3333)); // 33,33
      expect(commitment.installments[2].amount).toBe(money(3333)); // 33,33

      // Verify sum
      const sum = commitment.installments.reduce(
        (acc, inst) => acc + (inst.amount as unknown as number),
        0
      );
      expect(sum).toBe(10000);

      // Verify due dates (monthly cadence)
      expect(commitment.installments[0].dueDate).toBe("2026-08-15");
      expect(commitment.installments[1].dueDate).toBe("2026-09-15");
      expect(commitment.installments[2].dueDate).toBe("2026-10-15");

      // Verify status
      expect(commitment.installments.every((inst) => inst.status === "prevista")).toBe(true);
    });

    it("should reject invalid installment count", async () => {
      const result = await createCommitmentCore(
        {
          mode: "installment_payment",
          total: "100,00",
          installmentCount: 1, // Invalid: < 2
          firstDueDate: "2026-08-15",
          description: "Test",
          categoryId: testCategoryId,
        },
        mockHeaders
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.installmentCount).toBeDefined();
    });

    it("should reject total > 10M", async () => {
      const result = await createCommitmentCore(
        {
          mode: "installment_payment",
          total: "11.000.000,00", // > 10M limit
          installmentCount: 2,
          firstDueDate: "2026-08-15",
          description: "Too much",
          categoryId: testCategoryId,
        },
        mockHeaders
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.total).toBeDefined();
    });
  });

  describe("create fixed_payment", () => {
    it("should create fixed_payment commitment", async () => {
      const result = await createCommitmentCore(
        {
          mode: "fixed_payment",
          installmentValue: "1.200,00", // R$ 12,00 per installment
          installmentCount: 48,
          firstDueDate: "2026-09-05",
          description: "Carro",
          categoryId: testCategoryId,
        },
        mockHeaders
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok=true");

      const commitment = result.commitment;
      expect(commitment.mode).toBe("fixed_payment");
      expect(commitment.total).toBe(money(1200 * 48)); // 57.600
      expect(commitment.installmentCount).toBe(48);

      // Verify all installments are equal
      expect(commitment.installments).toHaveLength(48);
      expect(commitment.installments.every((inst) => inst.amount === money(120000))).toBe(true);
    });

    it("should reject parcela × N > 10M", async () => {
      const result = await createCommitmentCore(
        {
          mode: "fixed_payment",
          installmentValue: "1.000.000,00", // 1M per installment
          installmentCount: 15, // 15M total
          firstDueDate: "2026-09-05",
          description: "Too much",
          categoryId: testCategoryId,
        },
        mockHeaders
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.installmentValue).toBeDefined();
    });
  });

  describe("validation", () => {
    it("should reject non-existent category", async () => {
      const result = await createCommitmentCore(
        {
          mode: "installment_payment",
          total: "100,00",
          installmentCount: 2,
          firstDueDate: "2026-08-15",
          description: "Test",
          categoryId: "non-existent-id",
        },
        mockHeaders
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.categoryId).toBeDefined();
    });

    it("should reject entrada category (only saida allowed)", async () => {
      const entradaCategory = await prisma.category.create({
        data: {
          name: "Salary",
          type: "entrada",
          userId: testUserId,
        },
      });

      const result = await createCommitmentCore(
        {
          mode: "installment_payment",
          total: "100,00",
          installmentCount: 2,
          firstDueDate: "2026-08-15",
          description: "Test",
          categoryId: entradaCategory.id,
        },
        mockHeaders
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.categoryId).toBeDefined();

      await prisma.category.delete({ where: { id: entradaCategory.id } });
    });

    it("should reject invalid date format", async () => {
      const result = await createCommitmentCore(
        {
          mode: "installment_payment",
          total: "100,00",
          installmentCount: 2,
          firstDueDate: "invalid-date",
          description: "Test",
          categoryId: testCategoryId,
        },
        mockHeaders
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.firstDueDate).toBeDefined();
    });

    it("should reject invalid description", async () => {
      const result = await createCommitmentCore(
        {
          mode: "installment_payment",
          total: "100,00",
          installmentCount: 2,
          firstDueDate: "2026-08-15",
          description: "", // Empty
          categoryId: testCategoryId,
        },
        mockHeaders
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.description).toBeDefined();
    });
  });
});
