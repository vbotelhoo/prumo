"use server";

import { headers } from "next/headers";
import type { Transaction } from "../domain/types";
import { updateTransactionCore } from "./update-transaction-core";

type Result =
  | { ok: true; transaction: Transaction }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Server action for updating a transaction.
 * Delegates to updateTransactionCore for testable logic.
 */
export async function updateTransactionAction(
  id: string,
  input: unknown
): Promise<Result> {
  return updateTransactionCore(id, input, await headers());
}
