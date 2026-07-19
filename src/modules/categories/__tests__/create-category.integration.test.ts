import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared";
import { createCategoryCore } from "../actions/create-category-core";
import { headers } from "next/headers";
import { signUpUser } from "@/modules/auth/__tests__/helpers";
import { CATEGORY_NAME_IN_USE_ERROR } from "../domain/constants";

describe("createCategoryAction", () => {
  let userId: string;
  let testHeaders: ReturnType<typeof headers>;

  beforeEach(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({
      where: { userId: { not: null } },
    });
    await prisma.user.deleteMany({});

    // Create a test user
    const user = await signUpUser({
      email: `test-cat-${Date.now()}@example.com`,
      password: "TestPassword123!",
      name: "Test User",
      birthDate: "1990-01-01",
    });
    userId = user.id;

    // Create a mock headers object
    testHeaders = {
      get: (name: string) => {
        if (name === "cookie") {
          return ""; // Mock cookie (will be set by session)
        }
        return null;
      },
    } as any;
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

  it("should create a custom category for the user", async () => {
    const input = {
      name: "Viagem",
      type: "saida",
    };

    const result = await createCategoryCore(input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.category.name).toBe("Viagem");
      expect(result.category.type).toBe("saida");
      expect(result.category.userId).toBe(userId);

      // Verify it was persisted
      const persisted = await prisma.category.findUnique({
        where: { id: result.category.id },
      });
      expect(persisted).toBeDefined();
      expect(persisted?.userId).toBe(userId);
    }
  });

  it("should reject duplicate name (case-insensitive) for same type", async () => {
    // Create first category
    await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId,
      },
    });

    // Try to create another with different case
    const result = await createCategoryCore(
      {
        name: "viagem",
        type: "saida",
      },
      testHeaders
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(CATEGORY_NAME_IN_USE_ERROR);
    }
  });

  it("should allow duplicate name for different type", async () => {
    // Create category for "saida"
    await prisma.category.create({
      data: {
        name: "Outros",
        type: "saida",
        userId,
      },
    });

    // Create category for "entrada" with same name
    const result = await createCategoryCore(
      {
        name: "Outros",
        type: "entrada",
      },
      testHeaders
    );

    expect(result.ok).toBe(true);
  });

  it("should trim the name before creating", async () => {
    const result = await createCategoryCore(
      {
        name: "  Viagem  ",
        type: "saida",
      },
      testHeaders
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.category.name).toBe("Viagem");
    }
  });

  it("should reject empty name", async () => {
    const result = await createCategoryCore(
      {
        name: "",
        type: "saida",
      },
      testHeaders
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("should reject name longer than 40 chars", async () => {
    const result = await createCategoryCore(
      {
        name: "a".repeat(41),
        type: "saida",
      },
      testHeaders
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("should reject invalid type", async () => {
    const result = await createCategoryCore(
      {
        name: "Viagem",
        type: "invalido",
      },
      testHeaders
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.type).toBeDefined();
    }
  });

  it("should enforce isolation: user B cannot see category of user A", async () => {
    // Create category for user A
    const categoryA = await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId,
      },
    });

    // Create user B
    const userB = await signUpUser({
      email: `test-cat-b-${Date.now()}@example.com`,
      password: "TestPassword123!",
      name: "Test User B",
      birthDate: "1990-01-01",
    });

    // User B tries to use the name "Viagem" - should be allowed (not taken for them)
    const result = await createCategoryCore(
      {
        name: "Viagem",
        type: "saida",
      },
      testHeaders
    );

    expect(result.ok).toBe(true);

    // Clean up user B
    await prisma.category.deleteMany({
      where: { userId: userB.id },
    });
    await prisma.user.delete({
      where: { id: userB.id },
    });
  });
});
