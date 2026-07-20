import { auth } from "@/modules/auth";
import { parseBRL, money, prisma } from "@/shared";
import { z } from "zod";
import type { Commitment } from "../domain/types";
import { updateCommitmentInputSchema } from "../domain/schemas";
import { getCommitmentForUser, replacePrevistaInstallments } from "../data/commitments-repository";
import {
  COMMITMENT_NOT_FOUND_ERROR,
  INVALID_AMOUNT_ERROR,
  INVALID_CATEGORY_ERROR,
  INVALID_INSTALLMENT_COUNT_ERROR,
  INVALID_TOTAL_ERROR,
} from "../domain/constants";
import { findCategoryForUser } from "@/modules/categories";
import { regeneratePrevistaInstallments, splitInstallments } from "../domain/installments";

type Result =
  | { ok: true; commitment: Commitment }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Core logic for updating a commitment.
 * Respects "pagas são imutáveis" rule: only regenerates prevista installments.
 */
export async function updateCommitmentCore(
  commitmentId: string,
  input: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any
): Promise<Result> {
  // 1. Get session
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  // 2. Fetch existing commitment (ensures ownership via AD-012)
  let commitment: Commitment;
  try {
    commitment = await getCommitmentForUser(commitmentId, session.user.id);
  } catch {
    return { ok: false, error: COMMITMENT_NOT_FOUND_ERROR };
  }

  // 3. Validate input structure
  const parseResult = updateCommitmentInputSchema.safeParse(input);
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

  const { total: totalRaw, installmentValue: installmentValueRaw, installmentCount: newCount, firstDueDate: newFirstDueDate, description: newDescription, categoryId: newCategoryId, scope } = parseResult.data;

  // 4. Parse amounts and calculate new total
  let newTotal: number | undefined;

  if (totalRaw) {
    const parsed = parseBRL(totalRaw);
    if (parsed === null) {
      return {
        ok: false,
        error: INVALID_AMOUNT_ERROR,
        fieldErrors: { total: [INVALID_AMOUNT_ERROR] },
      };
    }
    newTotal = parsed;
  } else if (installmentValueRaw && commitment.mode === "fixed_payment") {
    const parsed = parseBRL(installmentValueRaw);
    if (parsed === null) {
      return {
        ok: false,
        error: INVALID_AMOUNT_ERROR,
        fieldErrors: { installmentValue: [INVALID_AMOUNT_ERROR] },
      };
    }
    newTotal = parsed * (newCount ?? commitment.installmentCount);
  }

  // 5. Validate amounts
  if (newTotal !== undefined) {
    const amountSchema = z
      .number()
      .int()
      .min(1)
      .max(1_000_000_000, "Valor não pode exceder R$ 10.000.000,00");

    const validation = amountSchema.safeParse(newTotal);
    if (!validation.success) {
      return {
        ok: false,
        error: INVALID_TOTAL_ERROR,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fieldErrors: { total: validation.error.issues.map((e: any) => e.message) },
      };
    }

    // Validate that splitInstallments would work
    if (commitment.installments) {
      const paidCount = commitment.installments.filter((i) => i.status === "paga").length;
      const newPrevistCount = (newCount ?? commitment.installmentCount) - paidCount;
      if (newPrevistCount > 0) {
        try {
          splitInstallments(money(newTotal), newPrevistCount);
        } catch {
          return {
            ok: false,
            error: "Número de parcelas gera parcelas menores que R$ 0,01",
            fieldErrors: { installmentCount: [INVALID_INSTALLMENT_COUNT_ERROR] },
          };
        }
      }
    }
  }

  // 6. Validate category if provided
  let newCategoryIdToUse = commitment.categoryId;
  if (newCategoryId) {
    const category = await findCategoryForUser(newCategoryId, session.user.id, "saida");
    if (!category) {
      return {
        ok: false,
        error: INVALID_CATEGORY_ERROR,
        fieldErrors: { categoryId: [INVALID_CATEGORY_ERROR] },
      };
    }
    newCategoryIdToUse = newCategoryId;
  }

  // 7. Regenerate prevista installments if needed
  let regeneratedInstallments: typeof commitment.installments | null = null;

  if (newTotal !== undefined || newCount || newFirstDueDate) {
    const finalTotal = newTotal ?? commitment.total as unknown as number;
    const finalCount = newCount ?? commitment.installmentCount;
    const finalFirstDueDate = newFirstDueDate ?? commitment.firstDueDate;
    const finalScope = scope ?? "todas";

    const result = regeneratePrevistaInstallments(
      money(finalTotal),
      finalCount,
      finalFirstDueDate,
      commitment.installments!,
      finalScope
    );

    if (!result.success) {
      return {
        ok: false,
        error: result.error,
        fieldErrors: { installmentCount: [result.error] },
      };
    }

    regeneratedInstallments = result.regenerated as unknown as typeof commitment.installments;
  }

  // 8. Update commitment in repository
  try {
    // Update commitment fields
    await prisma.commitment.update({
      where: { id: commitmentId },
      data: {
        ...(newTotal && { total: newTotal }),
        ...(newCount && { installmentCount: newCount }),
        ...(newFirstDueDate && { firstDueDate: newFirstDueDate }),
        ...(newDescription && { description: newDescription }),
        ...(newCategoryId && { categoryId: newCategoryIdToUse }),
      },
    });

    // Replace prevista installments if amounts/count/dates changed
    if (regeneratedInstallments) {
      await replacePrevistaInstallments(commitmentId, session.user.id, regeneratedInstallments.map((inst) => ({
        number: inst.number,
        amount: inst.amount as unknown as number,
        dueDate: inst.dueDate,
        status: inst.status,
      })));
    }

    // Fetch updated commitment
    return {
      ok: true,
      commitment: await getCommitmentForUser(commitmentId, session.user.id),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar compromisso";
    return { ok: false, error: message };
  }
}
