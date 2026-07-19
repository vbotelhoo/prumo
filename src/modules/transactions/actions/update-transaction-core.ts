import { auth } from "@/modules/auth";
import { parseBRL } from "@/shared/money";
import { z } from "zod";
import type { Transaction } from "../domain/types";
import { transactionInputSchema } from "../domain/schemas";
import { updateTransaction as updateTransactionRepo } from "../data/transactions-repository";
import {
  INVALID_AMOUNT_ERROR,
  INVALID_CATEGORY_ERROR,
  TRANSACTION_NOT_FOUND_ERROR,
} from "../domain/constants";
import { findCategoryForUser } from "@/modules/categories";
import type { Headers } from "next/headers";

type Result =
  | { ok: true; transaction: Transaction }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Core logic for updating a transaction.
 * Testable without "use server" directive.
 *
 * Flow: Same validation as create, but updates existing transaction.
 */
export async function updateTransactionCore(
  id: string,
  input: unknown,
  headers: Headers
): Promise<Result> {
  // 1. Get session and extract userId
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  // 2. Validate input structure
  const parseResult = transactionInputSchema.safeParse(input);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    parseResult.error.errors.forEach((error) => {
      const path = error.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(error.message);
    });
    return { ok: false, error: "Validação falhou", fieldErrors };
  }

  const { type, date, amountRaw, description, categoryId } = parseResult.data;

  // 3. Parse BRL amount to cents
  const amountCents = parseBRL(amountRaw);
  if (amountCents === null) {
    return {
      ok: false,
      error: INVALID_AMOUNT_ERROR,
      fieldErrors: { amountRaw: [INVALID_AMOUNT_ERROR] },
    };
  }

  // 4. Validate amount (> 0, <= 10M cents = R$100,000)
  const amountValidation = z
    .number()
    .int()
    .min(1, "Valor deve ser maior que zero")
    .max(1_000_000_000, "Valor não pode exceder R$ 10.000.000,00")
    .safeParse(amountCents);

  if (!amountValidation.success) {
    return {
      ok: false,
      error: INVALID_AMOUNT_ERROR,
      fieldErrors: { amountRaw: amountValidation.error.errors.map((e) => e.message) },
    };
  }

  // 5. Validate category exists and type matches
  const category = await findCategoryForUser(categoryId, session.user.id, type as "entrada" | "saida");
  if (!category) {
    return {
      ok: false,
      error: INVALID_CATEGORY_ERROR,
      fieldErrors: { categoryId: [INVALID_CATEGORY_ERROR] },
    };
  }

  // 6. Update transaction
  try {
    const transaction = await updateTransactionRepo(id, session.user.id, {
      type,
      date,
      amount: amountValidation.data,
      description,
      categoryId,
    });

    return { ok: true, transaction };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === TRANSACTION_NOT_FOUND_ERROR) {
        return { ok: false, error: TRANSACTION_NOT_FOUND_ERROR };
      }
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Erro ao atualizar transação" };
  }
}
