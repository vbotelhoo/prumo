import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared";
import { createTransactionCore } from "../actions/create-transaction-core";
// eslint-disable-next-line boundaries/entry-point
import { signUpCore } from "../../../modules/auth/actions/sign-up-core";
import {
  INVALID_AMOUNT_ERROR,
  INVALID_CATEGORY_ERROR,
} from "../domain/constants";

describe("createTransactionAction", () => {
  let userId: string;
  let userBId: string;
  let testHeaders: Headers;
  let categoryId: string;

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
      cpf: "12345678901",
      zipCode: "01310100",
      street: "Test Street",
      addressNumber: "123",
      neighborhood: "Test Hood",
      city: "Test City",
      state: "TS",
      email: `test-txn-${Date.now()}@example.com`,
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
      cpf: "12345678902",
      zipCode: "01310100",
      street: "Test Street",
      addressNumber: "124",
      neighborhood: "Test Hood",
      city: "Test City",
      state: "TS",
      email: `test-txn-b-${Date.now()}@example.com`,
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

    // Create a custom category for the user
    const category = await prisma.category.create({
      data: {
        name: "Salário",
        type: "entrada",
        userId,
      },
    });
    categoryId = category.id;

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

  it("should create a transaction with correct amount in cents", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "5000,00",
      description: "Salário mensal",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.amount).toBe(500000); // 5000 * 100 = 500000 cents
      expect(result.transaction.type).toBe("entrada");
      expect(result.transaction.date).toBe("2026-07-19");
      expect(result.transaction.description).toBe("Salário mensal");
      expect(result.transaction.userId).toBe(userId);
    }
  });

  it("should parse BRL with thousand separator", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1.234,56",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.amount).toBe(123456); // 1234.56 * 100
    }
  });

  it("should reject zero amount", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "0,00",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(INVALID_AMOUNT_ERROR);
    }
  });

  it("should reject negative amount", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "-100,00",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(INVALID_AMOUNT_ERROR);
    }
  });

  it("should reject amount exceeding 10M", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "10000000,01",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(INVALID_AMOUNT_ERROR);
    }
  });

  it("should reject invalid amount format", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "abc",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(INVALID_AMOUNT_ERROR);
    }
  });

  it("should reject empty amount", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
  });

  it("should reject category from another user", async () => {
    // Create a category for user B
    const userBCategory = await prisma.category.create({
      data: {
        name: "Viagem",
        type: "entrada",
        userId: userBId,
      },
    });

    // User A tries to use category of user B
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1000,00",
      categoryId: userBCategory.id,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(INVALID_CATEGORY_ERROR);
    }
  });

  it("should reject type mismatch with category", async () => {
    // Create a category for "entrada"
    const entradaCategory = await prisma.category.create({
      data: {
        name: "Salário",
        type: "entrada",
        userId,
      },
    });

    // Try to create a "saida" transaction with "entrada" category
    const input = {
      type: "saida",
      date: "2026-07-19",
      amountRaw: "100,00",
      categoryId: entradaCategory.id,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(INVALID_CATEGORY_ERROR);
    }
  });

  it("should reject invalid category", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1000,00",
      categoryId: "non-existent-id",
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(INVALID_CATEGORY_ERROR);
    }
  });

  it("should reject date outside valid range", async () => {
    const input = {
      type: "entrada",
      date: "1999-12-31",
      amountRaw: "1000,00",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
  });

  it("should accept date in the future (up to +100 years)", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 50);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const input = {
      type: "entrada",
      date: futureDateStr,
      amountRaw: "1000,00",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(true);
  });

  it("should accept transaction without description", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1000,00",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.description).toBeNull();
    }
  });

  it("should accept empty description as null", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1000,00",
      description: "",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.description).toBeNull();
    }
  });

  it("should reject description longer than 140 chars", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1000,00",
      description: "a".repeat(141),
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(false);
  });

  it("should trim description with leading/trailing spaces", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1000,00",
      description: "  Salário mensal  ",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.description).toBe("Salário mensal");
    }
  });

  it("should enforce user isolation: transaction linked to correct user", async () => {
    const input = {
      type: "entrada",
      date: "2026-07-19",
      amountRaw: "1000,00",
      categoryId,
    };

    const result = await createTransactionCore(input, testHeaders);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify it's linked to the correct user
      const persisted = await prisma.transaction.findUnique({
        where: { id: result.transaction.id },
      });
      expect(persisted?.userId).toBe(userId);
    }
  });
});
