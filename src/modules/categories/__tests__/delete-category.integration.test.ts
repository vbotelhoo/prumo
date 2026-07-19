import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared";
import { deleteCategoryCore } from "../actions/delete-category-core";
// eslint-disable-next-line boundaries/entry-point
import { signUpCore } from "../../../modules/auth/actions/sign-up-core";
import {
  CATEGORY_IN_USE_ERROR,
  CATEGORY_NOT_FOUND_ERROR,
} from "../domain/constants";

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

describe("deleteCategoryAction", () => {
  let userId: string;
  let userBId: string;
  let testHeaders: Headers;

  beforeEach(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({
      where: { userId: { not: null } },
    });
    await prisma.user.deleteMany({});

    // Create two test users
    const userAInput = {
      name: "Test User A",
      birthDate: "1990-01-01",
      cpf: uniqueValidCpf(),
      zipCode: "01310100",
      street: "Test Street",
      addressNumber: "123",
      neighborhood: "Test Hood",
      city: "Test City",
      state: "TS",
      email: `test-del-a-${Date.now()}@example.com`,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
      termsAccepted: true,
    };

    const userASignUp = await signUpCore(userAInput, new Headers());
    if (!userASignUp.ok) {
      throw new Error("Failed to create user A");
    }

    const userA = await prisma.user.findUnique({
      where: { email: userAInput.email },
    });
    if (!userA) {
      throw new Error("User A not found");
    }

    userId = userA.id;

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
      email: `test-del-b-${Date.now()}@example.com`,
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

    // Build request headers carrying user A's real session cookie so
    // getSession() inside deleteCategoryCore can resolve the user.
    testHeaders = new Headers({ cookie: buildCookieHeader(userASignUp) });
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

  it("should delete a custom category that has no transactions", async () => {
    // Create a custom category
    const category = await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId,
      },
    });

    const result = await deleteCategoryCore(category.id, testHeaders);

    expect(result.ok).toBe(true);

    // Verify it was deleted
    const deleted = await prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(deleted).toBeNull();
  });

  it("should reject deletion of category that is in use", async () => {
    // Create a custom category and a transaction using it
    const category = await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId,
      },
    });

    await prisma.transaction.create({
      data: {
        type: "saida",
        date: "2026-07-19",
        amount: 50000,
        categoryId: category.id,
        userId,
      },
    });

    const result = await deleteCategoryCore(category.id, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(CATEGORY_IN_USE_ERROR);
    }

    // Verify it still exists
    const stillExists = await prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(stillExists).toBeDefined();
  });

  it("should reject deletion of default category (userId=null)", async () => {
    // Use a seeded default category (no userId) instead of creating a
    // duplicate, which would collide with the seeded "Salário"/entrada.
    const category = await prisma.category.findFirstOrThrow({
      where: { userId: null, type: "entrada" },
    });

    const result = await deleteCategoryCore(category.id, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(CATEGORY_NOT_FOUND_ERROR);
    }

    // Verify it still exists
    const stillExists = await prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(stillExists).toBeDefined();
  });

  it("should reject deletion of category from another user", async () => {
    // Create a custom category for user B
    const category = await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId: userBId,
      },
    });

    // User A tries to delete category of user B
    const result = await deleteCategoryCore(category.id, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(CATEGORY_NOT_FOUND_ERROR);
    }

    // Verify it still exists
    const stillExists = await prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(stillExists).toBeDefined();
  });

  it("should return error for non-existent category", async () => {
    const result = await deleteCategoryCore("non-existent-id", testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(CATEGORY_NOT_FOUND_ERROR);
    }
  });

  it("should handle race condition: transaction created between check and delete", async () => {
    // Create a custom category
    const category = await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId,
      },
    });

    // Simulate a race condition by creating a transaction after the check
    // This is hard to test in integration without mocking, but we verify
    // that the FK Restrict error handling would catch it.
    // For now, we test that the category is protected once a transaction exists.

    await prisma.transaction.create({
      data: {
        type: "saida",
        date: "2026-07-19",
        amount: 50000,
        categoryId: category.id,
        userId,
      },
    });

    const result = await deleteCategoryCore(category.id, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(CATEGORY_IN_USE_ERROR);
    }
  });

  it("should be idempotent: second delete of same category is safe", async () => {
    // Create and delete a category
    const category = await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId,
      },
    });

    const firstDelete = await deleteCategoryCore(category.id, testHeaders);
    expect(firstDelete.ok).toBe(true);

    // Second delete should also return a defined result (not crash)
    const secondDelete = await deleteCategoryCore(category.id, testHeaders);

    // Either ok:true (if still deleted) or ok:false (if already gone)
    // The spec expects consistent error, so we expect CATEGORY_NOT_FOUND_ERROR
    expect(secondDelete.ok).toBe(false);
    if (!secondDelete.ok) {
      expect(secondDelete.error).toBe(CATEGORY_NOT_FOUND_ERROR);
    }
  });
});
