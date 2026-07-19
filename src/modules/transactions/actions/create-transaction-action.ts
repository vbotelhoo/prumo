"use server";

import { headers } from "next/headers";
import type { Transaction } from "../domain/types";
import { createTransactionCore } from "./create-transaction-core";

type Result =
  | { ok: true; transaction: Transaction }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Server action for creating a transaction.
 * Delegates to createTransactionCore for testable logic.
 */
export async function createTransactionAction(input: unknown): Promise<Result> {
  return createTransactionCore(input, await headers());
}
