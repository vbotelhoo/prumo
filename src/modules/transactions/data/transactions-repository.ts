import { prisma, money } from "@/shared";
import type { Transaction } from "../domain/types";
import { TRANSACTION_NOT_FOUND_ERROR } from "../domain/constants";

class AppError extends Error {
  constructor(public message: string) {
    super(message);
    this.name = "AppError";
  }
}

const PAGE_SIZE = 20;

interface ListTransactionsResult {
  items: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Lista transações do usuário com paginação.
 * Retorna items ordenados por date DESC, depois createdAt DESC.
 * Inclui categoryName via join.
 */
export async function listTransactions(
  userId: string,
  page: number
): Promise<ListTransactionsResult> {
  const skip = (page - 1) * PAGE_SIZE;

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      include: {
        category: {
          select: { name: true },
        },
      },
    }),
    prisma.transaction.count({
      where: { userId },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return {
    items: items.map((txn) => ({
      id: txn.id,
      type: txn.type as "entrada" | "saida",
      date: txn.date,
      amount: money(txn.amount),
      description: txn.description,
      categoryId: txn.categoryId,
      categoryName: txn.category.name,
      userId: txn.userId,
      createdAt: txn.createdAt,
    })),
    total,
    page,
    totalPages,
  };
}

/**
 * Cria uma nova transação.
 */
export async function createTransaction(input: {
  type: string;
  date: string;
  amount: number;
  description?: string;
  categoryId: string;
  userId: string;
}): Promise<Transaction> {
  const txn = await prisma.transaction.create({
    data: {
      type: input.type,
      date: input.date,
      amount: input.amount,
      description: input.description || null,
      categoryId: input.categoryId,
      userId: input.userId,
    },
    include: {
      category: {
        select: { name: true },
      },
    },
  });

  return {
    id: txn.id,
    type: txn.type as "entrada" | "saida",
    date: txn.date,
    amount: money(txn.amount),
    description: txn.description,
    categoryId: txn.categoryId,
    categoryName: txn.category.name,
    userId: txn.userId,
    createdAt: txn.createdAt,
  };
}

/**
 * Atualiza uma transação.
 * Filtra por id e userId para garantir isolamento (AD-012).
 * Lança AppError se não encontrada ou de outro usuário.
 */
export async function updateTransaction(
  id: string,
  userId: string,
  input: {
    type: string;
    date: string;
    amount: number;
    description?: string;
    categoryId: string;
  }
): Promise<Transaction> {
  const updated = await prisma.transaction.updateMany({
    where: {
      id,
      userId,
    },
    data: {
      type: input.type,
      date: input.date,
      amount: input.amount,
      description: input.description || null,
      categoryId: input.categoryId,
    },
  });

  if (updated.count === 0) {
    throw new AppError(TRANSACTION_NOT_FOUND_ERROR);
  }

  // Fetch the updated transaction to return it with categoryName
  const txn = await prisma.transaction.findUniqueOrThrow({
    where: { id },
    include: {
      category: {
        select: { name: true },
      },
    },
  });

  return {
    id: txn.id,
    type: txn.type as "entrada" | "saida",
    date: txn.date,
    amount: money(txn.amount),
    description: txn.description,
    categoryId: txn.categoryId,
    categoryName: txn.category.name,
    userId: txn.userId,
    createdAt: txn.createdAt,
  };
}

/**
 * Deleta uma transação.
 * Idempotente: não lança erro se não encontrada (duplo clique).
 * Filtra por id e userId para garantir isolamento (AD-012).
 */
export async function deleteTransaction(id: string, userId: string): Promise<void> {
  await prisma.transaction.deleteMany({
    where: {
      id,
      userId,
    },
  });
  // Silencioso: count = 0 não gera erro (idempotente)
}

/**
 * Busca uma transação pelo ID se pertencer ao usuário.
 */
export async function findTransactionById(
  id: string,
  userId: string
): Promise<Transaction | null> {
  const txn = await prisma.transaction.findUnique({
    where: { id },
    include: {
      category: {
        select: { name: true },
      },
    },
  });

  if (!txn || txn.userId !== userId) {
    return null;
  }

  return {
    id: txn.id,
    type: txn.type as "entrada" | "saida",
    date: txn.date,
    amount: money(txn.amount),
    description: txn.description,
    categoryId: txn.categoryId,
    categoryName: txn.category.name,
    userId: txn.userId,
    createdAt: txn.createdAt,
  };
}
