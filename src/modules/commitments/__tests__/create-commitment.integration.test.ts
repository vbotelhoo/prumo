import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, money } from "@/shared";
import { createCommitmentCore } from "../actions/create-commitment-core";
// eslint-disable-next-line boundaries/entry-point
import { signUpCore } from "../../../modules/auth/actions/sign-up-core";

// Gera um CPF matematicamente válido (algoritmo oficial), já que o signup
// passa pela validação real de checksum.
function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function uniqueValidCpf(seed: number): string {
  const base = Array.from({ length: 9 }, (_, i) => (seed + i) % 10);
  const d1 = checkDigit(base, 10);
  const d2 = checkDigit([...base, d1], 11);
  return [...base, d1, d2].join("");
}

// Repassa só o par nome=valor de cada cookie (sem atributos como Path,
// HttpOnly) — formato esperado pelo header `Cookie` de uma request, a
// partir do `Set-Cookie` retornado por signUpCore.
function buildCookieHeader(result: { ok: boolean; responseHeaders?: Headers }): string {
  const setCookie = result.responseHeaders?.get("set-cookie") ?? "";
  return setCookie
    .split(/,(?=\s*[^=;\s]+=)/)
    .map((part) => part.split(";")[0]!.trim())
    .join("; ");
}

describe("create-commitment (integration)", () => {
  let testUserId = "";
  let testCategoryId = "";
  let testHeaders: Headers;

  beforeAll(async () => {
    const userInput = {
      name: "Test User",
      birthDate: "1990-01-01",
      cpf: uniqueValidCpf(1),
      zipCode: "12345000",
      street: "Rua Test",
      addressNumber: "123",
      neighborhood: "Bairro",
      city: "Cidade",
      state: "SP",
      email: `test-create-commit-${Date.now()}@example.com`,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
      termsAccepted: true,
    };

    const userSignUp = await signUpCore(userInput, new Headers());
    if (!userSignUp.ok) {
      throw new Error("Failed to create test user");
    }

    const user = await prisma.user.findUnique({ where: { email: userInput.email } });
    if (!user) {
      throw new Error("User not found");
    }
    testUserId = user.id;

    // Create test category
    const category = await prisma.category.create({
      data: {
        name: "Eletrônicos",
        type: "saida",
        userId: testUserId,
      },
    });
    testCategoryId = category.id;

    // Build request headers carrying the real session cookie so
    // getSession() inside createCommitmentCore can resolve the user.
    testHeaders = new Headers({ cookie: buildCookieHeader(userSignUp) });
  });

  afterAll(async () => {
    // Clean up test data scoped to this suite's user (order matters)
    await prisma.installment.deleteMany({ where: { userId: testUserId } });
    await prisma.commitment.deleteMany({ where: { userId: testUserId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.category.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  beforeEach(async () => {
    // Clear commitments/installments created by the previous test, keep the
    // shared user/category/session from beforeAll intact
    await prisma.installment.deleteMany({ where: { userId: testUserId } });
    await prisma.commitment.deleteMany({ where: { userId: testUserId } });
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
        testHeaders
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok=true");

      const commitment = result.commitment;
      const installments = commitment.installments!;
      expect(commitment.mode).toBe("installment_payment");
      expect(commitment.total).toBe(money(10000)); // R$ 100,00 in cents
      expect(commitment.installmentCount).toBe(3);
      expect(commitment.description).toBe("Notebook");

      // Verify arredondamento: 33,34 + 33,33 + 33,33 = 100,00
      expect(installments).toHaveLength(3);
      expect(installments[0].amount).toBe(money(3334)); // 33,34
      expect(installments[1].amount).toBe(money(3333)); // 33,33
      expect(installments[2].amount).toBe(money(3333)); // 33,33

      // Verify sum
      const sum = installments.reduce(
        (acc, inst) => acc + (inst.amount as unknown as number),
        0
      );
      expect(sum).toBe(10000);

      // Verify due dates (monthly cadence)
      expect(installments[0].dueDate).toBe("2026-08-15");
      expect(installments[1].dueDate).toBe("2026-09-15");
      expect(installments[2].dueDate).toBe("2026-10-15");

      // Verify status
      expect(installments.every((inst) => inst.status === "prevista")).toBe(true);
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
        testHeaders
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok=false");
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
        testHeaders
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok=false");
      expect(result.fieldErrors?.total).toBeDefined();
    });
  });

  describe("create fixed_payment", () => {
    it("should create fixed_payment commitment", async () => {
      const result = await createCommitmentCore(
        {
          mode: "fixed_payment",
          installmentValue: "1.200,00", // R$ 1.200,00 per installment
          installmentCount: 48,
          firstDueDate: "2026-09-05",
          description: "Carro",
          categoryId: testCategoryId,
        },
        testHeaders
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok=true");

      const commitment = result.commitment;
      expect(commitment.mode).toBe("fixed_payment");
      expect(commitment.total).toBe(money(120000 * 48)); // 57.600,00
      expect(commitment.installmentCount).toBe(48);

      // Verify all installments are equal
      expect(commitment.installments!).toHaveLength(48);
      expect(commitment.installments!.every((inst) => inst.amount === money(120000))).toBe(true);
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
        testHeaders
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok=false");
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
        testHeaders
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok=false");
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
        testHeaders
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok=false");
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
        testHeaders
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok=false");
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
        testHeaders
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected ok=false");
      expect(result.fieldErrors?.description).toBeDefined();
    });
  });
});
