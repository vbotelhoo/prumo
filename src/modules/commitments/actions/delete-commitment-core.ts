import { auth } from "@/modules/auth";
import { getCommitmentForUser, deleteCommitment as deleteCommitmentRepo } from "../data/commitments-repository";
import { COMMITMENT_NOT_FOUND_ERROR } from "../domain/constants";

type Result =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Delete a commitment and its prevista installments.
 * Pagas installments are preserved as history.
 * If no pagas remain, the commitment is also deleted.
 */
export async function deleteCommitmentCore(
  commitmentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any
): Promise<Result> {
  // 1. Get session
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  // 2. Verify commitment exists and belongs to user (AD-012)
  try {
    await getCommitmentForUser(commitmentId, session.user.id);
  } catch {
    return { ok: false, error: COMMITMENT_NOT_FOUND_ERROR };
  }

  // 3. Delete
  try {
    await deleteCommitmentRepo(commitmentId, session.user.id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir compromisso";
    return { ok: false, error: message };
  }
}
