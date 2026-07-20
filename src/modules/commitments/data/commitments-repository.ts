import { prisma, money } from "@/shared";
import type { Commitment, Installment } from "../domain/types";
import {
  COMMITMENT_NOT_FOUND_ERROR,
  INSTALLMENT_NOT_FOUND_ERROR,
} from "../domain/constants";

class AppError extends Error {
  constructor(public message: string) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * List commitments for a user, ordered by createdAt DESC.
 * Includes installments and category name.
 */
export async function listCommitmentsByUser(userId: string): Promise<Commitment[]> {
  const commitments = await prisma.commitment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      installments: {
        orderBy: { dueDate: "asc" },
      },
      category: {
        select: { name: true },
      },
    },
  });

  return commitments.map((c) => ({
    id: c.id,
    mode: c.mode as "installment_payment" | "fixed_payment",
    total: money(c.total),
    installmentCount: c.installmentCount,
    firstDueDate: c.firstDueDate,
    description: c.description,
    categoryId: c.categoryId,
    categoryName: c.category.name,
    userId: c.userId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    installments: c.installments.map((inst) => ({
      id: inst.id,
      number: inst.number,
      amount: money(inst.amount),
      dueDate: inst.dueDate,
      status: inst.status as "prevista" | "paga",
      commitmentId: inst.commitmentId,
      userId: inst.userId,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
    })),
  }));
}

/**
 * Get a single commitment by ID, ensuring it belongs to the user (AD-012).
 * Throws AppError if not found or owned by another user.
 */
export async function getCommitmentForUser(
  commitmentId: string,
  userId: string
): Promise<Commitment> {
  const commitment = await prisma.commitment.findFirst({
    where: {
      id: commitmentId,
      userId,
    },
    include: {
      installments: {
        orderBy: { dueDate: "asc" },
      },
      category: {
        select: { name: true },
      },
    },
  });

  if (!commitment) {
    throw new AppError(COMMITMENT_NOT_FOUND_ERROR);
  }

  return {
    id: commitment.id,
    mode: commitment.mode as "installment_payment" | "fixed_payment",
    total: money(commitment.total),
    installmentCount: commitment.installmentCount,
    firstDueDate: commitment.firstDueDate,
    description: commitment.description,
    categoryId: commitment.categoryId,
    categoryName: commitment.category.name,
    userId: commitment.userId,
    createdAt: commitment.createdAt,
    updatedAt: commitment.updatedAt,
    installments: commitment.installments.map((inst) => ({
      id: inst.id,
      number: inst.number,
      amount: money(inst.amount),
      dueDate: inst.dueDate,
      status: inst.status as "prevista" | "paga",
      commitmentId: inst.commitmentId,
      userId: inst.userId,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
    })),
  };
}

/**
 * Create a commitment with installments in a single atomic transaction.
 * Throws AppError if commitment not created (should not happen unless DB error).
 */
export async function createCommitmentWithInstallments(input: {
  mode: "installment_payment" | "fixed_payment";
  total: number; // in cents
  installmentCount: number;
  firstDueDate: string;
  description: string;
  categoryId: string;
  userId: string;
  installments: Array<{
    number: number;
    amount: number;
    dueDate: string;
    status: "prevista" | "paga";
  }>;
}): Promise<Commitment> {
  const result = await prisma.$transaction(async (tx) => {
    // Create commitment first
    const commitment = await tx.commitment.create({
      data: {
        mode: input.mode,
        total: input.total,
        installmentCount: input.installmentCount,
        firstDueDate: input.firstDueDate,
        description: input.description,
        categoryId: input.categoryId,
        userId: input.userId,
      },
    });

    // Create installments
    await tx.installment.createMany({
      data: input.installments.map((inst) => ({
        number: inst.number,
        amount: inst.amount,
        dueDate: inst.dueDate,
        status: inst.status,
        commitmentId: commitment.id,
        userId: input.userId,
      })),
    });

    // Fetch the full commitment with installments and category
    return tx.commitment.findUniqueOrThrow({
      where: { id: commitment.id },
      include: {
        installments: {
          orderBy: { dueDate: "asc" },
        },
        category: {
          select: { name: true },
        },
      },
    });
  });

  return {
    id: result.id,
    mode: result.mode as "installment_payment" | "fixed_payment",
    total: money(result.total),
    installmentCount: result.installmentCount,
    firstDueDate: result.firstDueDate,
    description: result.description,
    categoryId: result.categoryId,
    categoryName: result.category.name,
    userId: result.userId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    installments: result.installments.map((inst) => ({
      id: inst.id,
      number: inst.number,
      amount: money(inst.amount),
      dueDate: inst.dueDate,
      status: inst.status as "prevista" | "paga",
      commitmentId: inst.commitmentId,
      userId: inst.userId,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
    })),
  };
}

/**
 * Replace prevista installments atomically.
 * Deletes all prevista installments and creates new ones, preserving pagas.
 * Renumbers installments by dueDate order.
 */
export async function replacePrevistaInstallments(
  commitmentId: string,
  userId: string,
  newInstallments: Array<{
    number: number;
    amount: number;
    dueDate: string;
    status: "prevista" | "paga";
  }>
): Promise<Commitment> {
  const result = await prisma.$transaction(async (tx) => {
    // Delete all prevista for this commitment
    await tx.installment.deleteMany({
      where: {
        commitmentId,
        userId,
        status: "prevista",
      },
    });

    // Create new installments
    await tx.installment.createMany({
      data: newInstallments.map((inst) => ({
        number: inst.number,
        amount: inst.amount,
        dueDate: inst.dueDate,
        status: inst.status,
        commitmentId,
        userId,
      })),
    });

    // Update installmentCount on commitment
    await tx.commitment.update({
      where: { id: commitmentId },
      data: {
        installmentCount: newInstallments.length +
          (await tx.installment.count({
            where: { commitmentId, userId, status: "paga" },
          })),
      },
    });

    // Fetch updated commitment
    return tx.commitment.findUniqueOrThrow({
      where: { id: commitmentId },
      include: {
        installments: {
          orderBy: { dueDate: "asc" },
        },
        category: {
          select: { name: true },
        },
      },
    });
  });

  return {
    id: result.id,
    mode: result.mode as "installment_payment" | "fixed_payment",
    total: money(result.total),
    installmentCount: result.installmentCount,
    firstDueDate: result.firstDueDate,
    description: result.description,
    categoryId: result.categoryId,
    categoryName: result.category.name,
    userId: result.userId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    installments: result.installments.map((inst) => ({
      id: inst.id,
      number: inst.number,
      amount: money(inst.amount),
      dueDate: inst.dueDate,
      status: inst.status as "prevista" | "paga",
      commitmentId: inst.commitmentId,
      userId: inst.userId,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
    })),
  };
}

/**
 * Set installment status (prevista/paga).
 * Idempotent: setting to the same status is allowed.
 * Throws AppError if installment not found or owned by another user.
 */
export async function setInstallmentStatus(
  installmentId: string,
  userId: string,
  status: "prevista" | "paga"
): Promise<Installment> {
  const updated = await prisma.installment.updateMany({
    where: {
      id: installmentId,
      userId,
    },
    data: { status },
  });

  if (updated.count === 0) {
    throw new AppError(INSTALLMENT_NOT_FOUND_ERROR);
  }

  const installment = await prisma.installment.findUniqueOrThrow({
    where: { id: installmentId },
  });

  return {
    id: installment.id,
    number: installment.number,
    amount: money(installment.amount),
    dueDate: installment.dueDate,
    status: installment.status as "prevista" | "paga",
    commitmentId: installment.commitmentId,
    userId: installment.userId,
    createdAt: installment.createdAt,
    updatedAt: installment.updatedAt,
  };
}

/**
 * Delete a commitment and its prevista installments (pagas are preserved).
 * If no pagas remain after deletion, delete the commitment too.
 * Throws AppError if commitment not found or owned by another user.
 */
export async function deleteCommitment(
  commitmentId: string,
  userId: string
): Promise<void> {
  const commitment = await prisma.commitment.findFirst({
    where: { id: commitmentId, userId },
    include: {
      installments: true,
    },
  });

  if (!commitment) {
    throw new AppError(COMMITMENT_NOT_FOUND_ERROR);
  }

  await prisma.$transaction(async (tx) => {
    // Delete prevista installments
    await tx.installment.deleteMany({
      where: {
        commitmentId,
        userId,
        status: "prevista",
      },
    });

    // Check if any pagas remain
    const remainingPagas = await tx.installment.count({
      where: {
        commitmentId,
        userId,
        status: "paga",
      },
    });

    // If no pagas remain, delete the commitment itself
    if (remainingPagas === 0) {
      await tx.commitment.delete({
        where: { id: commitmentId },
      });
    }
  });
}

export { AppError };
