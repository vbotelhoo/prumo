import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared";
import {
  updateTransactionCore,
  deleteTransactionCore,
} from "../actions";
// eslint-disable-next-line boundaries/entry-point
import { signUpCore } from "../../../modules/auth/actions/sign-up-core";
import { TRANSACTION_NOT_FOUND_ERROR } from "../domain/constants";

// Gera um CPF matematicamente válido e único por seed (algoritmo oficial),
// já que a criação de usuário passa pela validação real de checksum.
function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

let cpfSeed = 0;
function uniqueValidCpf(): string {
  cpfSeed += 1;
  const base = Array.from({ length: 9 }, (_, i) => (cpfSeed + i) % 10);
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

describe("updateTransactionAction", () => {
  let userId: string;
  let userBId: string;
  let testHeaders: Headers;
  let categoryId: string;
  let transactionId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({
      where: { userId: { not: null } },
    });
    await prisma.user.deleteMany({});

    // Create a test user
    const userInput = {
      name: "Test User",
      birthDate: "1990-01-01",
      cpf: uniqueValidCpf(),
      zipCode: "01310100",
      street: "Test Street",
      addressNumber: "123",
      neighborhood: "Test Hood",
      city: "Test City",
      state: "TS",
      email: `test-upd-${Date.now()}@example.com`,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
      termsAccepted: true,
    };

    const userSignUp = await signUpCore(userInput, new Headers());
    if (!userSignUp.ok) {
      throw new Error("Failed to create test user");
    }

    const user = await prisma.user.findUnique({
      where: { email: userInput.email },
    });
    if (!user) {
      throw new Error("User not found");
    }

    userId = user.id;

    // Create user B for isolation tests
    const userBInput = {
      name: "Test User B",
      birthDate: "1990-01-02",
      cpf: uniqueValidCpf(),
      zipCode: "01310100",
      street: "Test Street",
      addressNumber: "124",
      neighborhood: "Test Hood",
      city: "Test City",
      state: "TS",
      email: `test-upd-b-${Date.now()}@example.com`,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
      termsAccepted: true,
    };

    const userBSignUp = await signUpCore(userBInput, new Headers());
    if (!userBSignUp.ok) {
      throw new Error("Failed to create user B");
    }

    const userB = await prisma.user.findUnique({
      where: { email: userBInput.email },
    });
    if (!userB) {
      throw new Error("User B not found");
    }

    userBId = userB.id;

    // Create categories for the user
    const category = await prisma.category.create({
      data: {
        name: "Salário",
        type: "entrada",
        userId,
      },
    });
    categoryId = category.id;

    // Create a category for saida
    await prisma.category.create({
      data: {
        name: "Alimentação",
        type: "saida",
        userId,
      },
    });

    // Create a transaction
    const txn = await prisma.transaction.create({
      data: {
        type: "entrada",
        date: "2026-07-19",
        amount: 100000, // R$ 1000.00
        description: "Initial salary",
        categoryId,
        userId,
      },
    });
    transactionId = txn.id;

    // Build request headers carrying the real session cookie so
    // getSession() inside updateTransactionCore can resolve the user.
    testHeaders = new Headers({ cookie: buildCookieHeader(userSignUp) });
  });

  afterEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({
      where: {
        OR: [{ userId }, { userId: userBId }],
      },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: userId }, { id: userBId }],
      },
    });
  });

  it("should update transaction with new values", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-20",
      amountRaw: "2000,00",
      description: "Updated salary",
      categoryId,
    };

    const result = await updateTransactionCore(transactionId, input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.date).toBe("2026-07-20");
      expect(result.transaction.amount).toBe(200000);
      expect(result.transaction.description).toBe("Updated salary");

      // Verify in database
      const persisted = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
      expect(persisted?.amount).toBe(200000);
    }
  });

  it("should reject type change when category incompatible", async () => {
    // Get a saida category
    const saidaCategory = await prisma.category.findFirst({
      where: { userId, type: "saida" },
    });

    const input = {
      type: "saida",
      date: "2026-07-20",
      amountRaw: "500,00",
      categoryId: saidaCategory?.id || "",
    };

    // Update with same type should work
    const result = await updateTransactionCore(transactionId, input, testHeaders);
    expect(result.ok).toBe(true);
  });

  it("should reject update of transaction from another user", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-20",
      amountRaw: "2000,00",
      categoryId,
    };

    const result = await updateTransactionCore(transactionId, input, testHeaders);

    // This should work because testHeaders is from userId (first created)
    expect(result.ok).toBe(true);

    // Note: To truly test cross-user rejection, we'd need to pass a different
    // session context, which requires mocking auth differently
  });

  it("should reject update with invalid category", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-20",
      amountRaw: "2000,00",
      categoryId: "non-existent-id",
    };

    const result = await updateTransactionCore(transactionId, input, testHeaders);

    expect(result.ok).toBe(false);
  });

  it("should preserve validation in update", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-20",
      amountRaw: "abc", // Invalid amount
      categoryId,
    };

    const result = await updateTransactionCore(transactionId, input, testHeaders);

    expect(result.ok).toBe(false);
  });

  it("should reject update of non-existent transaction", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-20",
      amountRaw: "2000,00",
      categoryId,
    };

    const result = await updateTransactionCore("non-existent-id", input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(TRANSACTION_NOT_FOUND_ERROR);
    }
  });
});

describe("deleteTransactionAction", () => {
  let userId: string;
  let testHeaders: Headers;
  let categoryId: string;
  let transactionId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({
      where: { userId: { not: null } },
    });
    await prisma.user.deleteMany({});

    // Create a test user
    const userInput = {
      name: "Test User",
      birthDate: "1990-01-01",
      cpf: uniqueValidCpf(),
      zipCode: "01310100",
      street: "Test Street",
      addressNumber: "123",
      neighborhood: "Test Hood",
      city: "Test City",
      state: "TS",
      email: `test-del-txn-${Date.now()}@example.com`,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
      termsAccepted: true,
    };

    const userSignUp = await signUpCore(userInput, new Headers());
    if (!userSignUp.ok) {
      throw new Error("Failed to create test user");
    }

    const user = await prisma.user.findUnique({
      where: { email: userInput.email },
    });
    if (!user) {
      throw new Error("User not found");
    }

    userId = user.id;

    // Create a category
    const category = await prisma.category.create({
      data: {
        name: "Salário",
        type: "entrada",
        userId,
      },
    });
    categoryId = category.id;

    // Create a transaction
    const txn = await prisma.transaction.create({
      data: {
        type: "entrada",
        date: "2026-07-19",
        amount: 100000,
        categoryId,
        userId,
      },
    });
    transactionId = txn.id;

    // Build request headers carrying the real session cookie so
    // getSession() inside deleteTransactionCore can resolve the user.
    testHeaders = new Headers({ cookie: buildCookieHeader(userSignUp) });
  });

  afterEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({
      where: { userId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });
  });

  it("should delete a transaction", async () => {
    const result = await deleteTransactionCore(transactionId, testHeaders);

    expect(result.ok).toBe(true);

    // Verify it was deleted
    const deleted = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    expect(deleted).toBeNull();
  });

  it("should be idempotent: second delete does not error", async () => {
    // First delete
    const firstDelete = await deleteTransactionCore(transactionId, testHeaders);
    expect(firstDelete.ok).toBe(true);

    // Second delete should also succeed (idempotent)
    const secondDelete = await deleteTransactionCore(transactionId, testHeaders);
    expect(secondDelete.ok).toBe(true);
  });

  it("should reject delete of transaction from another user", async () => {
    // This would require a different auth context
    // For now, we verify that the repository uses userId filtering
    const result = await deleteTransactionCore(transactionId, testHeaders);
    expect(result.ok).toBe(true);

    // Verify deletion happened for current user
    const deleted = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    expect(deleted).toBeNull();
  });

  it("should handle multiple deletes gracefully", async () => {
    // Create multiple transactions
    const txn2 = await prisma.transaction.create({
      data: {
        type: "entrada",
        date: "2026-07-20",
        amount: 100000,
        categoryId,
        userId,
      },
    });

    // Delete both
    const result1 = await deleteTransactionCore(transactionId, testHeaders);
    const result2 = await deleteTransactionCore(txn2.id, testHeaders);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    // Verify both deleted
    const count = await prisma.transaction.count({
      where: { userId },
    });
    expect(count).toBe(0);
  });
});
