import { auth } from "@/modules/auth";
// eslint-disable-next-line boundaries/entry-point
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResult.error.issues.forEach((issue: any) => {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fieldErrors: { amountRaw: amountValidation.error.issues.map((e: any) => e.message) },
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
