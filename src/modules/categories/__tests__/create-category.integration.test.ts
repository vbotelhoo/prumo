import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/shared";
import { createCategoryCore } from "../actions/create-category-core";
import { CATEGORY_NAME_IN_USE_ERROR } from "../domain/constants";
// eslint-disable-next-line boundaries/entry-point
import { signUpCore } from "../../../modules/auth/actions/sign-up-core";

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

describe("createCategoryAction", () => {
  let userId: string;
  let testHeaders: Headers;

  beforeEach(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({
      where: { userId: { not: null } },
    });
    await prisma.user.deleteMany({});

    // Create a test user using signUpCore
    const signUpInput = {
      name: "Test User",
      birthDate: "1990-01-01",
      cpf: uniqueValidCpf(),
      zipCode: "01310100",
      street: "Test Street",
      addressNumber: "123",
      neighborhood: "Test Hood",
      city: "Test City",
      state: "TS",
      email: `test-cat-${Date.now()}@example.com`,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
      termsAccepted: true,
    };

    const signUpResult = await signUpCore(signUpInput, new Headers());
    if (!signUpResult.ok) {
      throw new Error("Failed to create test user");
    }

    // Get the created user
    const user = await prisma.user.findUnique({
      where: { email: signUpInput.email },
    });
    if (!user) {
      throw new Error("User not found after signup");
    }

    userId = user.id;

    // Build request headers carrying the real session cookie so
    // getSession() inside createCategoryCore can resolve the user.
    testHeaders = new Headers({ cookie: buildCookieHeader(signUpResult) });
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
    // "Presente" is not a default category name for either type, so it
    // only collides if the (name, type, userId) uniqueness check is
    // incorrectly scoped across types.
    await prisma.category.create({
      data: {
        name: "Presente",
        type: "saida",
        userId,
      },
    });

    // Create category for "entrada" with same name
    const result = await createCategoryCore(
      {
        name: "Presente",
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
    await prisma.category.create({
      data: {
        name: "Viagem",
        type: "saida",
        userId,
      },
    });

    // Create user B
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
      email: `test-cat-b-${Date.now()}@example.com`,
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

    // User B tries to use the name "Viagem" - should be allowed (not taken for them)
    const userBHeaders = new Headers({ cookie: buildCookieHeader(userBSignUp) });
    const result = await createCategoryCore(
      {
        name: "Viagem",
        type: "saida",
      },
      userBHeaders
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
