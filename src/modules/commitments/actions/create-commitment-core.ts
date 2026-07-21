import { auth } from "@/modules/auth";
import { parseBRL, money } from "@/shared";
import { z } from "zod";
import type { Commitment } from "../domain/types";
import { createCommitmentInputSchema } from "../domain/schemas";
import { createCommitmentWithInstallments } from "../data/commitments-repository";
import {
  INVALID_AMOUNT_ERROR,
  INVALID_CATEGORY_ERROR,
  INVALID_INSTALLMENT_COUNT_ERROR,
  INVALID_TOTAL_ERROR,
} from "../domain/constants";
import { findCategoryForUser } from "@/modules/categories";
import { materializeInstallments, splitInstallments } from "../domain/installments";

type Result =
  | { ok: true; commitment: Commitment }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Core logic for creating a commitment (parcelada or fixed_payment).
 * Testable without "use server" directive.
 *
 * Flow:
 * 1. Get session and extract userId
 * 2. Validate input structure with Zod
 * 3. Parse BRL amount strings to cents
 * 4. Calculate and validate total and installment values
 * 5. Validate category exists and is saída type
 * 6. Materialize installments
 * 7. Create commitment atomically
 */
export async function createCommitmentCore(
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
  const parseResult = createCommitmentInputSchema.safeParse(input);
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

  const { mode, total: totalRaw, installmentValue: installmentValueRaw, installmentCount, firstDueDate, description, categoryId } = parseResult.data;

  // 3. Parse BRL amounts to cents
  let totalCents: number | null;
  let installmentValueCents: number | null;

  if (mode === "installment_payment") {
    totalCents = parseBRL(totalRaw!);
    installmentValueCents = null;

    if (totalCents === null) {
      return {
        ok: false,
        error: INVALID_AMOUNT_ERROR,
        fieldErrors: { total: [INVALID_AMOUNT_ERROR] },
      };
    }
  } else {
    // fixed_payment
    installmentValueCents = parseBRL(installmentValueRaw!);
    totalCents = null;

    if (installmentValueCents === null) {
      return {
        ok: false,
        error: INVALID_AMOUNT_ERROR,
        fieldErrors: { installmentValue: [INVALID_AMOUNT_ERROR] },
      };
    }
  }

  // 4. Validate amounts and calculate totals
  const amountSchema = z
    .number()
    .int()
    .min(1, "Valor deve ser maior que zero")
    .max(1_000_000_000, "Valor não pode exceder R$ 10.000.000,00");

  let validTotal: number;

  if (mode === "installment_payment") {
    const validation = amountSchema.safeParse(totalCents);
    if (!validation.success) {
      return {
        ok: false,
        error: INVALID_TOTAL_ERROR,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fieldErrors: { total: validation.error.issues.map((e: any) => e.message) },
      };
    }
    validTotal = validation.data;

    // Validate that no installment would be < 1 cent
    try {
      splitInstallments(money(validation.data), installmentCount);
    } catch {
      return {
        ok: false,
        error: "Número de parcelas gera parcelas menores que R$ 0,01",
        fieldErrors: { installmentCount: [INVALID_INSTALLMENT_COUNT_ERROR] },
      };
    }
  } else {
    // fixed_payment
    const validation = amountSchema.safeParse(installmentValueCents!);
    if (!validation.success) {
      return {
        ok: false,
        error: INVALID_AMOUNT_ERROR,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fieldErrors: { installmentValue: validation.error.issues.map((e: any) => e.message) },
      };
    }

    validTotal = validation.data * installmentCount;

    // Validate total doesn't exceed max
    if (validTotal > 1_000_000_000) {
      return {
        ok: false,
        error: "Valor total (parcela × N) não pode exceder R$ 10.000.000,00",
        fieldErrors: { installmentValue: ["Valor total resultante excede o limite"] },
      };
    }
  }

  // 5. Validate category exists and is saída type
  const category = await findCategoryForUser(categoryId, session.user.id, "saida");
  if (!category) {
    return {
      ok: false,
      error: INVALID_CATEGORY_ERROR,
      fieldErrors: { categoryId: [INVALID_CATEGORY_ERROR] },
    };
  }

  // 6. Materialize installments
  const installments = materializeInstallments(money(validTotal), installmentCount, firstDueDate, mode);

  // 7. Create commitment atomically
  try {
    const commitment = await createCommitmentWithInstallments({
      mode,
      total: validTotal,
      installmentCount,
      firstDueDate,
      description,
      categoryId,
      userId: session.user.id,
      installments: installments.map((inst) => ({
        number: inst.number,
        amount: inst.amount as unknown as number,
        dueDate: inst.dueDate,
        status: inst.status,
      })),
    });

    return { ok: true, commitment };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar compromisso";
    return { ok: false, error: message };
  }
}
