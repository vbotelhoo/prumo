import { auth } from "@/modules/auth";
import type { Installment } from "../domain/types";
import { setInstallmentStatusSchema } from "../domain/schemas";
import { setInstallmentStatus as setInstallmentStatusRepo } from "../data/commitments-repository";
import { INSTALLMENT_NOT_FOUND_ERROR } from "../domain/constants";

type Result =
  | { ok: true; installment: Installment }
  | { ok: false; error: string };

/**
 * Set installment status (toggle prevista ↔ paga).
 * Idempotent: setting to the same status is allowed.
 */
export async function setInstallmentStatusCore(
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
  const parseResult = setInstallmentStatusSchema.safeParse(input);
  if (!parseResult.success) {
    return { ok: false, error: "Validação falhou" };
  }

  const { installmentId, status } = parseResult.data;

  // 3. Update installment status (AD-012 isolation built into repo)
  try {
    const installment = await setInstallmentStatusRepo(installmentId, session.user.id, status);
    return { ok: true, installment };
  } catch (error) {
    if (error instanceof Error && error.message === INSTALLMENT_NOT_FOUND_ERROR) {
      return { ok: false, error: INSTALLMENT_NOT_FOUND_ERROR };
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar parcela";
    return { ok: false, error: message };
  }
}
