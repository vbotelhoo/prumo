import { auth } from "@/modules/auth";
import { deleteTransaction as deleteTransactionRepo } from "../data/transactions-repository";
import type { Headers } from "next/headers";

type Result =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Core logic for deleting a transaction.
 * Testable without "use server" directive.
 *
 * Flow:
 * 1. Get session and extract userId
 * 2. Delete transaction (idempotent: no error if not found)
 */
export async function deleteTransactionCore(
  id: string,
  headers: Headers
): Promise<Result> {
  // 1. Get session and extract userId
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  // 2. Delete transaction (idempotent)
  try {
    await deleteTransactionRepo(id, session.user.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Erro ao excluir transação" };
  }
}
