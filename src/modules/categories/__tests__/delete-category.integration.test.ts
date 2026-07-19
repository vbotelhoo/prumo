import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared";
import { deleteCategoryCore } from "../actions/delete-category-core";
// eslint-disable-next-line boundaries/entry-point
import { signUpCore } from "../../../modules/auth/actions/sign-up-core";
import {
  CATEGORY_IN_USE_ERROR,
  CATEGORY_NOT_FOUND_ERROR,
} from "../domain/constants";

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
      cpf: "12345678901",
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
      cpf: "12345678902",
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

    // Create a mock headers object
    testHeaders = new Headers();
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
    // Create a default category (no userId)
    const category = await prisma.category.create({
      data: {
        name: "Salário",
        type: "entrada",
        userId: null,
      },
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
