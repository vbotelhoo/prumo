import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/shared";
import {
  listCategoriesByUser,
  findCategoryForUser,
  isCategoryNameTaken,
  isCategoryInUse,
  createCategory,
  deleteCategory,
} from "../data/categories-repository";
import { CATEGORY_NOT_FOUND_ERROR } from "../domain/constants";

// Helpers to create test users
async function createTestUser(cpf: string) {
  return prisma.user.create({
    data: {
      id: `user-${cpf}`,
      name: "Test User",
      email: `test-${cpf}@example.com`,
      cpf,
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
}

// Cleanup after each test
const usersToCleanup = new Set<string>();
const categoriesToCleanup = new Set<string>();

afterEach(async () => {
  // Delete in correct order (transactions first, then categories, then users)
  if (categoriesToCleanup.size > 0) {
    await prisma.transaction.deleteMany({
      where: { categoryId: { in: Array.from(categoriesToCleanup) } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: Array.from(categoriesToCleanup) } },
    });
    categoriesToCleanup.clear();
  }

  if (usersToCleanup.size > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: Array.from(usersToCleanup) } },
    });
    usersToCleanup.clear();
  }
});

describe("categories-repository", () => {
  describe("listCategoriesByUser", () => {
    it("returns default categories for any user", async () => {
      const user = await createTestUser("12345678901");
      usersToCleanup.add(user.id);

      const categories = await listCategoriesByUser(user.id);

      // Should include all 13 default categories
      const defaultCategories = categories.filter((c) => c.userId === null);
      expect(defaultCategories.length).toBe(13);
    });

    it("returns user's custom categories plus defaults", async () => {
      const user = await createTestUser("12345678902");
      usersToCleanup.add(user.id);

      // Create a custom category for the user
      const custom = await createCategory({
        name: "Minha Categoria",
        type: "entrada",
        userId: user.id,
      });
      categoriesToCleanup.add(custom.id);

      const categories = await listCategoriesByUser(user.id);

      // Should have defaults + 1 custom
      const defaults = categories.filter((c) => c.userId === null);
      const customs = categories.filter((c) => c.userId === user.id);
      expect(defaults.length).toBe(13);
      expect(customs.length).toBe(1);
      expect(customs[0].name).toBe("Minha Categoria");
    });

    it("does not return other users' custom categories", async () => {
      const userA = await createTestUser("12345678903");
      const userB = await createTestUser("12345678904");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      // UserA creates a custom category
      const customA = await createCategory({
        name: "User A Custom",
        type: "saida",
        userId: userA.id,
      });
      categoriesToCleanup.add(customA.id);

      // UserB should not see UserA's custom category
      const categoriesB = await listCategoriesByUser(userB.id);
      const customsB = categoriesB.filter((c) => c.userId === userB.id);
      expect(customsB.length).toBe(0);

      // But UserA should see their own
      const categoriesA = await listCategoriesByUser(userA.id);
      const customsA = categoriesA.filter((c) => c.userId === userA.id);
      expect(customsA.length).toBe(1);
      expect(customsA[0].name).toBe("User A Custom");
    });

    it("returns categories ordered by name", async () => {
      const user = await createTestUser("12345678905");
      usersToCleanup.add(user.id);

      const categories = await listCategoriesByUser(user.id);

      // Check ordering by comparing consecutive names
      for (let i = 0; i < categories.length - 1; i++) {
        const current = categories[i].name.toLowerCase();
        const next = categories[i + 1].name.toLowerCase();
        expect(current <= next).toBe(true);
      }
    });
  });

  describe("findCategoryForUser", () => {
    it("returns a default category", async () => {
      const user = await createTestUser("12345678906");
      usersToCleanup.add(user.id);

      // Get a default category
      const allCategories = await listCategoriesByUser(user.id);
      const defaultCat = allCategories.find((c) => c.userId === null);
      expect(defaultCat).toBeDefined();

      // Should be findable
      const found = await findCategoryForUser(
        defaultCat!.id,
        user.id
      );
      expect(found).not.toBeNull();
      expect(found?.id).toBe(defaultCat!.id);
    });

    it("returns user's own custom category", async () => {
      const user = await createTestUser("12345678907");
      usersToCleanup.add(user.id);

      const custom = await createCategory({
        name: "My Category",
        type: "entrada",
        userId: user.id,
      });
      categoriesToCleanup.add(custom.id);

      const found = await findCategoryForUser(custom.id, user.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(custom.id);
      expect(found?.userId).toBe(user.id);
    });

    it("returns null for other user's custom category", async () => {
      const userA = await createTestUser("12345678908");
      const userB = await createTestUser("12345678909");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const customA = await createCategory({
        name: "User A Only",
        type: "saida",
        userId: userA.id,
      });
      categoriesToCleanup.add(customA.id);

      // UserB cannot see UserA's category
      const found = await findCategoryForUser(customA.id, userB.id);
      expect(found).toBeNull();
    });

    it("returns null when typeFilter doesn't match", async () => {
      const user = await createTestUser("12345678910");
      usersToCleanup.add(user.id);

      // Get a default "entrada" category
      const allCategories = await listCategoriesByUser(user.id);
      const entradaCat = allCategories.find(
        (c) => c.userId === null && c.type === "entrada"
      );
      expect(entradaCat).toBeDefined();

      // Filter with "saida" type
      const found = await findCategoryForUser(
        entradaCat!.id,
        user.id,
        "saida"
      );
      expect(found).toBeNull();
    });

    it("returns null when category doesn't exist", async () => {
      const user = await createTestUser("12345678911");
      usersToCleanup.add(user.id);

      const found = await findCategoryForUser("nonexistent-id", user.id);
      expect(found).toBeNull();
    });
  });

  describe("isCategoryNameTaken", () => {
    it("returns true when name matches a default category (case-insensitive)", async () => {
      const user = await createTestUser("12345678912");
      usersToCleanup.add(user.id);

      // "Salário" is a default entrada category
      const taken = await isCategoryNameTaken("Salário", "entrada", user.id);
      expect(taken).toBe(true);
    });

    it("returns true when name matches user's own custom category", async () => {
      const user = await createTestUser("12345678913");
      usersToCleanup.add(user.id);

      const custom = await createCategory({
        name: "Personal Expense",
        type: "saida",
        userId: user.id,
      });
      categoriesToCleanup.add(custom.id);

      const taken = await isCategoryNameTaken(
        "Personal Expense",
        "saida",
        user.id
      );
      expect(taken).toBe(true);
    });

    it("returns true for case-insensitive match", async () => {
      const user = await createTestUser("12345678914");
      usersToCleanup.add(user.id);

      const custom = await createCategory({
        name: "TestCategory",
        type: "entrada",
        userId: user.id,
      });
      categoriesToCleanup.add(custom.id);

      // Should match regardless of case
      const taken1 = await isCategoryNameTaken(
        "testcategory",
        "entrada",
        user.id
      );
      const taken2 = await isCategoryNameTaken(
        "TESTCATEGORY",
        "entrada",
        user.id
      );
      const taken3 = await isCategoryNameTaken(
        "TestCategory",
        "entrada",
        user.id
      );

      expect(taken1).toBe(true);
      expect(taken2).toBe(true);
      expect(taken3).toBe(true);
    });

    it("returns false when name doesn't exist", async () => {
      const user = await createTestUser("12345678915");
      usersToCleanup.add(user.id);

      const taken = await isCategoryNameTaken(
        "Nonexistent Category",
        "entrada",
        user.id
      );
      expect(taken).toBe(false);
    });

    it("returns false when name matches but different type", async () => {
      const user = await createTestUser("12345678916");
      usersToCleanup.add(user.id);

      const custom = await createCategory({
        name: "Shared Name",
        type: "entrada",
        userId: user.id,
      });
      categoriesToCleanup.add(custom.id);

      // Same name but different type should not be taken
      const taken = await isCategoryNameTaken(
        "Shared Name",
        "saida",
        user.id
      );
      expect(taken).toBe(false);
    });

    it("returns false for other user's custom category", async () => {
      const userA = await createTestUser("12345678917");
      const userB = await createTestUser("12345678918");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const customA = await createCategory({
        name: "Only For A",
        type: "entrada",
        userId: userA.id,
      });
      categoriesToCleanup.add(customA.id);

      // UserB should be able to use this name
      const taken = await isCategoryNameTaken("Only For A", "entrada", userB.id);
      expect(taken).toBe(false);
    });
  });

  describe("isCategoryInUse", () => {
    it("returns false when no transactions reference the category", async () => {
      const user = await createTestUser("12345678919");
      usersToCleanup.add(user.id);

      const custom = await createCategory({
        name: "Unused",
        type: "entrada",
        userId: user.id,
      });
      categoriesToCleanup.add(custom.id);

      const inUse = await isCategoryInUse(custom.id);
      expect(inUse).toBe(false);
    });

    it("returns true when transactions reference the category", async () => {
      const user = await createTestUser("12345678920");
      usersToCleanup.add(user.id);

      // Get a default category
      const allCategories = await listCategoriesByUser(user.id);
      const category = allCategories[0];

      // Create a transaction using this category
      const txn = await prisma.transaction.create({
        data: {
          type: category.type,
          date: "2025-01-15",
          amount: 50000,
          categoryId: category.id,
          userId: user.id,
        },
      });

      const inUse = await isCategoryInUse(category.id);
      expect(inUse).toBe(true);

      // References a default category (not tracked by categoriesToCleanup),
      // so it must be removed explicitly before afterEach deletes the user.
      await prisma.transaction.delete({ where: { id: txn.id } });
    });
  });

  describe("createCategory", () => {
    it("creates a custom category with correct fields", async () => {
      const user = await createTestUser("12345678921");
      usersToCleanup.add(user.id);

      const created = await createCategory({
        name: "New Category",
        type: "saida",
        userId: user.id,
      });
      categoriesToCleanup.add(created.id);

      expect(created.id).toBeDefined();
      expect(created.name).toBe("New Category");
      expect(created.type).toBe("saida");
      expect(created.userId).toBe(user.id);
    });

    it("persists category to database", async () => {
      const user = await createTestUser("12345678922");
      usersToCleanup.add(user.id);

      const created = await createCategory({
        name: "Persisted Category",
        type: "entrada",
        userId: user.id,
      });
      categoriesToCleanup.add(created.id);

      // Verify it exists in DB
      const found = await prisma.category.findUnique({
        where: { id: created.id },
      });
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Persisted Category");
    });
  });

  describe("deleteCategory", () => {
    it("deletes user's own custom category", async () => {
      const user = await createTestUser("12345678923");
      usersToCleanup.add(user.id);

      const custom = await createCategory({
        name: "To Delete",
        type: "entrada",
        userId: user.id,
      });
      categoriesToCleanup.add(custom.id);

      // Delete it
      await deleteCategory(custom.id, user.id);

      // Verify it's gone
      const found = await prisma.category.findUnique({
        where: { id: custom.id },
      });
      expect(found).toBeNull();
    });

    it("throws CATEGORY_NOT_FOUND_ERROR when deleting nonexistent category", async () => {
      const user = await createTestUser("12345678924");
      usersToCleanup.add(user.id);

      await expect(
        deleteCategory("nonexistent-id", user.id)
      ).rejects.toThrow(CATEGORY_NOT_FOUND_ERROR);
    });

    it("throws CATEGORY_NOT_FOUND_ERROR when deleting other user's category", async () => {
      const userA = await createTestUser("12345678925");
      const userB = await createTestUser("12345678926");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const customA = await createCategory({
        name: "User A's Category",
        type: "saida",
        userId: userA.id,
      });
      categoriesToCleanup.add(customA.id);

      // UserB tries to delete UserA's category
      await expect(deleteCategory(customA.id, userB.id)).rejects.toThrow(
        CATEGORY_NOT_FOUND_ERROR
      );

      // Verify it's still there
      const found = await prisma.category.findUnique({
        where: { id: customA.id },
      });
      expect(found).not.toBeNull();
    });

    it("throws CATEGORY_NOT_FOUND_ERROR when trying to delete default category", async () => {
      const user = await createTestUser("12345678927");
      usersToCleanup.add(user.id);

      // Get a default category
      const allCategories = await listCategoriesByUser(user.id);
      const defaultCat = allCategories.find((c) => c.userId === null);
      expect(defaultCat).toBeDefined();

      // Try to delete it (should fail because it's a default)
      await expect(deleteCategory(defaultCat!.id, user.id)).rejects.toThrow(
        CATEGORY_NOT_FOUND_ERROR
      );

      // Verify it's still there
      const found = await prisma.category.findUnique({
        where: { id: defaultCat!.id },
      });
      expect(found).not.toBeNull();
    });
  });
});
