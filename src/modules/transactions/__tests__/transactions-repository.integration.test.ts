import { afterEach, describe, expect, it } from "vitest";
import { prisma, money } from "@/shared";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  findTransactionById,
  getMonthlyTransactionTotals,
  getMonthlyExpensesByCategory,
} from "../data/transactions-repository";
import { TRANSACTION_NOT_FOUND_ERROR } from "../domain/constants";

// Helpers to create test users and categories
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

async function getDefaultCategory(type: "entrada" | "saida") {
  return prisma.category.findFirstOrThrow({
    where: { userId: null, type },
  });
}

async function getDefaultCategories(type: "entrada" | "saida", count: number) {
  return prisma.category.findMany({
    where: { userId: null, type },
    take: count,
  });
}

// Cleanup after each test
const usersToCleanup = new Set<string>();
const transactionsToCleanup = new Set<string>();

afterEach(async () => {
  if (usersToCleanup.size > 0) {
    // Delete all transactions for these users first (cascade cleanup)
    await prisma.transaction.deleteMany({
      where: { userId: { in: Array.from(usersToCleanup) } },
    });
    transactionsToCleanup.clear();
  }

  if (transactionsToCleanup.size > 0) {
    await prisma.transaction.deleteMany({
      where: { id: { in: Array.from(transactionsToCleanup) } },
    });
    transactionsToCleanup.clear();
  }

  if (usersToCleanup.size > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: Array.from(usersToCleanup) } },
    });
    usersToCleanup.clear();
  }
});

describe("transactions-repository", () => {
  describe("listTransactions", () => {
    it("returns empty array when user has no transactions", async () => {
      const user = await createTestUser("12345678901");
      usersToCleanup.add(user.id);

      const result = await listTransactions(user.id, 1);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("returns transactions ordered by date DESC, then createdAt DESC", async () => {
      const user = await createTestUser("12345678902");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      // Create transactions with different dates
      const txn1 = await createTransaction({
        type: "entrada",
        date: "2025-01-10",
        amount: 10000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn1.id);

      // Small delay to ensure different createdAt
      await new Promise((r) => setTimeout(r, 10));

      const txn2 = await createTransaction({
        type: "entrada",
        date: "2025-01-15",
        amount: 20000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn2.id);

      // Small delay
      await new Promise((r) => setTimeout(r, 10));

      const txn3 = await createTransaction({
        type: "entrada",
        date: "2025-01-15", // Same date as txn2
        amount: 30000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn3.id);

      const result = await listTransactions(user.id, 1);

      // txn2 and txn3 have same date (2025-01-15, descending)
      // txn3 was created later, so it should come first
      // txn1 has earlier date (2025-01-10)
      expect(result.items).toHaveLength(3);
      expect(result.items[0].date).toBe("2025-01-15");
      expect(result.items[1].date).toBe("2025-01-15");
      expect(result.items[2].date).toBe("2025-01-10");

      // For same date, txn3 created after txn2
      expect(result.items[0].id).toBe(txn3.id);
      expect(result.items[1].id).toBe(txn2.id);
      expect(result.items[2].id).toBe(txn1.id);
    });

    it("returns only transactions for the requested user", async () => {
      const userA = await createTestUser("12345678903");
      const userB = await createTestUser("12345678904");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const category = await getDefaultCategory("entrada");

      const txnA = await createTransaction({
        type: "entrada",
        date: "2025-01-15",
        amount: 10000,
        categoryId: category.id,
        userId: userA.id,
      });
      transactionsToCleanup.add(txnA.id);

      const txnB = await createTransaction({
        type: "entrada",
        date: "2025-01-15",
        amount: 20000,
        categoryId: category.id,
        userId: userB.id,
      });
      transactionsToCleanup.add(txnB.id);

      const resultA = await listTransactions(userA.id, 1);
      const resultB = await listTransactions(userB.id, 1);

      expect(resultA.items).toHaveLength(1);
      expect(resultA.items[0].id).toBe(txnA.id);

      expect(resultB.items).toHaveLength(1);
      expect(resultB.items[0].id).toBe(txnB.id);
    });

    it("handles pagination with 20 items per page", async () => {
      const user = await createTestUser("12345678905");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      // Create 25 transactions
      for (let i = 0; i < 25; i++) {
        const txn = await createTransaction({
          type: "entrada",
          date: `2025-01-${String(i + 1).padStart(2, "0")}`,
          amount: (i + 1) * 1000,
          categoryId: category.id,
          userId: user.id,
        });
        transactionsToCleanup.add(txn.id);
      }

      const page1 = await listTransactions(user.id, 1);
      const page2 = await listTransactions(user.id, 2);

      expect(page1.items).toHaveLength(20);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(2);

      expect(page2.items).toHaveLength(5);
      expect(page2.total).toBe(25);
      expect(page2.page).toBe(2);
      expect(page2.totalPages).toBe(2);

      // Items should not overlap
      const page1Ids = page1.items.map((t) => t.id);
      const page2Ids = page2.items.map((t) => t.id);
      const allIds = [...page1Ids, ...page2Ids];
      expect(allIds).toHaveLength(25);
      expect(new Set(allIds).size).toBe(25);
    });

    it("includes categoryName in response", async () => {
      const user = await createTestUser("12345678906");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-01-15",
        amount: 10000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      const result = await listTransactions(user.id, 1);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].categoryName).toBe(category.name);
      expect(result.items[0].categoryId).toBe(category.id);
    });

    it("calculates totalPages correctly", async () => {
      const user = await createTestUser("12345678907");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      // Create 0 transactions
      let result = await listTransactions(user.id, 1);
      expect(result.totalPages).toBe(1); // At least 1 page

      // Create 1 transaction
      const txn1 = await createTransaction({
        type: "entrada",
        date: "2025-01-15",
        amount: 10000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn1.id);

      result = await listTransactions(user.id, 1);
      expect(result.totalPages).toBe(1);

      // Create 20 more transactions (21 total)
      for (let i = 0; i < 20; i++) {
        const txn = await createTransaction({
          type: "entrada",
          date: `2025-02-${String(i + 1).padStart(2, "0")}`,
          amount: (i + 1) * 1000,
          categoryId: category.id,
          userId: user.id,
        });
        transactionsToCleanup.add(txn.id);
      }

      result = await listTransactions(user.id, 1);
      expect(result.totalPages).toBe(2);
    });
  });

  describe("createTransaction", () => {
    it("creates transaction with correct fields", async () => {
      const user = await createTestUser("12345678908");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 500000, // R$ 5.000,00
        description: "Salário",
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      expect(txn.type).toBe("entrada");
      expect(txn.date).toBe("2025-03-15");
      expect(txn.amount).toBe(money(500000));
      expect(txn.description).toBe("Salário");
      expect(txn.categoryId).toBe(category.id);
      expect(txn.categoryName).toBe(category.name);
      expect(txn.userId).toBe(user.id);
      expect(txn.createdAt).toBeInstanceOf(Date);
    });

    it("stores amount in centavos", async () => {
      const user = await createTestUser("12345678909");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 25037, // R$ 250,37
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      // Should be stored as 25037 (centavos)
      const inDb = await prisma.transaction.findUnique({
        where: { id: txn.id },
      });
      expect(inDb?.amount).toBe(25037);
      expect(txn.amount).toBe(money(25037));
    });

    it("handles null description", async () => {
      const user = await createTestUser("12345678910");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("saida");

      const txn = await createTransaction({
        type: "saida",
        date: "2025-03-15",
        amount: 10000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      expect(txn.description).toBeNull();
    });
  });

  describe("updateTransaction", () => {
    it("updates transaction fields", async () => {
      const user = await createTestUser("12345678911");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 10000,
        description: "Old",
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      const updated = await updateTransaction(txn.id, user.id, {
        type: "entrada",
        date: "2025-03-20",
        amount: 20000,
        description: "New",
        categoryId: category.id,
      });

      expect(updated.date).toBe("2025-03-20");
      expect(updated.amount).toBe(money(20000));
      expect(updated.description).toBe("New");
    });

    it("throws TRANSACTION_NOT_FOUND_ERROR when not found", async () => {
      const user = await createTestUser("12345678912");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      await expect(
        updateTransaction("nonexistent", user.id, {
          type: "entrada",
          date: "2025-03-15",
          amount: 10000,
          categoryId: category.id,
        })
      ).rejects.toThrow(TRANSACTION_NOT_FOUND_ERROR);
    });

    it("throws TRANSACTION_NOT_FOUND_ERROR when updating other user's transaction", async () => {
      const userA = await createTestUser("12345678913");
      const userB = await createTestUser("12345678914");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 10000,
        categoryId: category.id,
        userId: userA.id,
      });
      transactionsToCleanup.add(txn.id);

      // UserB tries to update UserA's transaction
      await expect(
        updateTransaction(txn.id, userB.id, {
          type: "entrada",
          date: "2025-03-20",
          amount: 20000,
          categoryId: category.id,
        })
      ).rejects.toThrow(TRANSACTION_NOT_FOUND_ERROR);
    });
  });

  describe("deleteTransaction", () => {
    it("deletes transaction", async () => {
      const user = await createTestUser("12345678915");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 10000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      await deleteTransaction(txn.id, user.id);

      const found = await prisma.transaction.findUnique({
        where: { id: txn.id },
      });
      expect(found).toBeNull();
    });

    it("is idempotent - second delete does not throw", async () => {
      const user = await createTestUser("12345678916");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 10000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      // First delete
      await deleteTransaction(txn.id, user.id);

      // Second delete should not throw
      await expect(deleteTransaction(txn.id, user.id)).resolves.not.toThrow();
    });

    it("does not delete other user's transaction", async () => {
      const userA = await createTestUser("12345678917");
      const userB = await createTestUser("12345678918");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 10000,
        categoryId: category.id,
        userId: userA.id,
      });
      transactionsToCleanup.add(txn.id);

      // UserB tries to delete UserA's transaction (silently fails due to idempotency)
      await deleteTransaction(txn.id, userB.id);

      // Transaction should still exist
      const found = await prisma.transaction.findUnique({
        where: { id: txn.id },
      });
      expect(found).not.toBeNull();
    });
  });

  describe("findTransactionById", () => {
    it("returns transaction if it belongs to user", async () => {
      const user = await createTestUser("12345678919");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 10000,
        description: "Test",
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      const found = await findTransactionById(txn.id, user.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(txn.id);
      expect(found?.description).toBe("Test");
      expect(found?.categoryName).toBe(category.name);
    });

    it("returns null if not found", async () => {
      const user = await createTestUser("12345678920");
      usersToCleanup.add(user.id);

      const found = await findTransactionById("nonexistent", user.id);
      expect(found).toBeNull();
    });

    it("returns null if transaction belongs to other user", async () => {
      const userA = await createTestUser("12345678921");
      const userB = await createTestUser("12345678922");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const category = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2025-03-15",
        amount: 10000,
        categoryId: category.id,
        userId: userA.id,
      });
      transactionsToCleanup.add(txn.id);

      // UserB tries to find UserA's transaction
      const found = await findTransactionById(txn.id, userB.id);
      expect(found).toBeNull();
    });
  });

  describe("getMonthlyTransactionTotals", () => {
    it("returns split entradas and saidas for a month with both types", async () => {
      const user = await createTestUser("12345678923");
      usersToCleanup.add(user.id);

      const categoryIn = await getDefaultCategory("entrada");
      const categoryOut = await getDefaultCategory("saida");

      // Create 2 entradas
      await createTransaction({
        type: "entrada",
        date: "2026-07-10",
        amount: 100000, // R$ 1.000
        categoryId: categoryIn.id,
        userId: user.id,
      });

      await createTransaction({
        type: "entrada",
        date: "2026-07-15",
        amount: 50000, // R$ 500
        categoryId: categoryIn.id,
        userId: user.id,
      });

      // Create 2 saidas
      const out1 = await createTransaction({
        type: "saida",
        date: "2026-07-20",
        amount: 30000, // R$ 300
        categoryId: categoryOut.id,
        userId: user.id,
      });
      transactionsToCleanup.add(out1.id);

      const out2 = await createTransaction({
        type: "saida",
        date: "2026-07-25",
        amount: 20000, // R$ 200
        categoryId: categoryOut.id,
        userId: user.id,
      });
      transactionsToCleanup.add(out2.id);

      const result = await getMonthlyTransactionTotals(user.id, "2026-07");

      expect(result.entradas).toBe(money(150000)); // R$ 1.500
      expect(result.saidas).toBe(money(50000)); // R$ 500
    });

    it("includes transactions on first day of month", async () => {
      const user = await createTestUser("12345678924");
      usersToCleanup.add(user.id);

      const categoryIn = await getDefaultCategory("entrada");

      const txn = await createTransaction({
        type: "entrada",
        date: "2026-07-01",
        amount: 100000,
        categoryId: categoryIn.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      const result = await getMonthlyTransactionTotals(user.id, "2026-07");

      expect(result.entradas).toBe(money(100000));
    });

    it("includes transactions on last day of month", async () => {
      const user = await createTestUser("12345678925");
      usersToCleanup.add(user.id);

      const categoryOut = await getDefaultCategory("saida");

      const txn = await createTransaction({
        type: "saida",
        date: "2026-07-31",
        amount: 50000,
        categoryId: categoryOut.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      const result = await getMonthlyTransactionTotals(user.id, "2026-07");

      expect(result.saidas).toBe(money(50000));
    });

    it("excludes transactions from other months", async () => {
      const user = await createTestUser("12345678926");
      usersToCleanup.add(user.id);

      const categoryIn = await getDefaultCategory("entrada");
      const categoryOut = await getDefaultCategory("saida");

      // Transaction in June (should not count)
      const txn1 = await createTransaction({
        type: "entrada",
        date: "2026-06-15",
        amount: 100000,
        categoryId: categoryIn.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn1.id);

      // Transaction in August (should not count)
      const txn2 = await createTransaction({
        type: "saida",
        date: "2026-08-15",
        amount: 100000,
        categoryId: categoryOut.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn2.id);

      // Transaction in July (should count)
      const txn3 = await createTransaction({
        type: "entrada",
        date: "2026-07-15",
        amount: 50000,
        categoryId: categoryIn.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn3.id);

      const result = await getMonthlyTransactionTotals(user.id, "2026-07");

      expect(result.entradas).toBe(money(50000));
      expect(result.saidas).toBe(money(0)); // June and August excluded
    });

    it("returns zeroed aggregates for month with no transactions", async () => {
      const user = await createTestUser("12345678927");
      usersToCleanup.add(user.id);

      const result = await getMonthlyTransactionTotals(user.id, "2026-07");

      expect(result.entradas).toBe(money(0));
      expect(result.saidas).toBe(money(0));
    });

    it("isolates aggregates between two users", async () => {
      const userA = await createTestUser("12345678928");
      const userB = await createTestUser("12345678929");
      usersToCleanup.add(userA.id);
      usersToCleanup.add(userB.id);

      const categoryIn = await getDefaultCategory("entrada");
      const categoryOut = await getDefaultCategory("saida");

      // UserA: R$ 100 entrada
      const txnA = await createTransaction({
        type: "entrada",
        date: "2026-07-10",
        amount: 10000,
        categoryId: categoryIn.id,
        userId: userA.id,
      });
      transactionsToCleanup.add(txnA.id);

      // UserB: R$ 200 entrada (should not affect UserA)
      const txnB = await createTransaction({
        type: "entrada",
        date: "2026-07-10",
        amount: 20000,
        categoryId: categoryIn.id,
        userId: userB.id,
      });
      transactionsToCleanup.add(txnB.id);

      const resultA = await getMonthlyTransactionTotals(userA.id, "2026-07");
      const resultB = await getMonthlyTransactionTotals(userB.id, "2026-07");

      expect(resultA.entradas).toBe(money(10000));
      expect(resultB.entradas).toBe(money(20000));
    });

    it("returns Money(0) when a type has no transactions in the month", async () => {
      const user = await createTestUser("12345678930");
      usersToCleanup.add(user.id);

      const categoryIn = await getDefaultCategory("entrada");

      // Only create entradas
      const txn = await createTransaction({
        type: "entrada",
        date: "2026-07-10",
        amount: 100000,
        categoryId: categoryIn.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn.id);

      const result = await getMonthlyTransactionTotals(user.id, "2026-07");

      // saidas should be Money(0), not undefined
      expect(result.saidas).toBe(money(0));
      expect(result.entradas).toBe(money(100000));
    });
  });

  describe("getMonthlyExpensesByCategory", () => {
    it("returns empty array for a month with no transactions", async () => {
      const user = await createTestUser("12345678931");
      usersToCleanup.add(user.id);

      const result = await getMonthlyExpensesByCategory(user.id, "2026-07");

      expect(result).toEqual([]);
    });

    it("sums correctly when a category has 2 transactions", async () => {
      const user = await createTestUser("12345678932");
      usersToCleanup.add(user.id);

      const category = await getDefaultCategory("saida");

      const txn1 = await createTransaction({
        type: "saida",
        date: "2026-07-05",
        amount: 5000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn1.id);

      const txn2 = await createTransaction({
        type: "saida",
        date: "2026-07-15",
        amount: 3000,
        categoryId: category.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txn2.id);

      const result = await getMonthlyExpensesByCategory(user.id, "2026-07");

      expect(result).toEqual([
        { categoryId: category.id, categoryName: category.name, total: money(8000) },
      ]);
    });

    it("returns 2 entries for 2 different categories", async () => {
      const user = await createTestUser("12345678933");
      usersToCleanup.add(user.id);

      const [categoryA, categoryB] = await getDefaultCategories("saida", 2);

      const txnA = await createTransaction({
        type: "saida",
        date: "2026-07-05",
        amount: 5000,
        categoryId: categoryA!.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txnA.id);

      const txnB = await createTransaction({
        type: "saida",
        date: "2026-07-10",
        amount: 7000,
        categoryId: categoryB!.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txnB.id);

      const result = await getMonthlyExpensesByCategory(user.id, "2026-07");

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { categoryId: categoryA!.id, categoryName: categoryA!.name, total: money(5000) },
          { categoryId: categoryB!.id, categoryName: categoryB!.name, total: money(7000) },
        ])
      );
    });

    it("does not leak transactions from another user", async () => {
      const userA = await createTestUser("12345678934");
      usersToCleanup.add(userA.id);
      const userB = await createTestUser("12345678935");
      usersToCleanup.add(userB.id);

      const category = await getDefaultCategory("saida");

      const txnA = await createTransaction({
        type: "saida",
        date: "2026-07-05",
        amount: 5000,
        categoryId: category.id,
        userId: userA.id,
      });
      transactionsToCleanup.add(txnA.id);

      const txnB = await createTransaction({
        type: "saida",
        date: "2026-07-05",
        amount: 9000,
        categoryId: category.id,
        userId: userB.id,
      });
      transactionsToCleanup.add(txnB.id);

      const resultA = await getMonthlyExpensesByCategory(userA.id, "2026-07");
      const resultB = await getMonthlyExpensesByCategory(userB.id, "2026-07");

      expect(resultA).toEqual([
        { categoryId: category.id, categoryName: category.name, total: money(5000) },
      ]);
      expect(resultB).toEqual([
        { categoryId: category.id, categoryName: category.name, total: money(9000) },
      ]);
    });

    it("only counts type saida, ignoring entrada transactions in the same month", async () => {
      const user = await createTestUser("12345678936");
      usersToCleanup.add(user.id);

      const categoryOut = await getDefaultCategory("saida");
      const categoryIn = await getDefaultCategory("entrada");

      const txnOut = await createTransaction({
        type: "saida",
        date: "2026-07-05",
        amount: 4000,
        categoryId: categoryOut.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txnOut.id);

      const txnIn = await createTransaction({
        type: "entrada",
        date: "2026-07-05",
        amount: 100000,
        categoryId: categoryIn.id,
        userId: user.id,
      });
      transactionsToCleanup.add(txnIn.id);

      const result = await getMonthlyExpensesByCategory(user.id, "2026-07");

      expect(result).toEqual([
        { categoryId: categoryOut.id, categoryName: categoryOut.name, total: money(4000) },
      ]);
    });
  });
});
