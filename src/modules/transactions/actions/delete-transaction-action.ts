"use server";

import { headers } from "next/headers";
import { deleteTransactionCore } from "./delete-transaction-core";

type Result =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Server action for deleting a transaction.
 * Delegates to deleteTransactionCore for testable logic.
 */
export async function deleteTransactionAction(id: string): Promise<Result> {
  return deleteTransactionCore(id, await headers());
}
