import { getMonthlyTransactionTotals } from "@/modules/transactions";
import { sumInstallmentsByMonth } from "@/modules/commitments";
import { buildMonthlyProjection } from "../domain/projection";
import type { MonthlyProjection } from "../domain/types";

/**
 * Compose monthly projection from cross-module aggregates.
 * Fetches transaction totals and commitment installments in parallel,
 * then applies the projection formula (pure domain function).
 * (AD-010, AD-016: aggregates from module owners, never direct Prisma reads)
 */
export async function getMonthlyProjection(
  userId: string,
  month: string
): Promise<MonthlyProjection> {
  // Fetch both aggregates in parallel
  const [txnTotals, commitmentSum] = await Promise.all([
    getMonthlyTransactionTotals(userId, month),
    sumInstallmentsByMonth(userId, month),
  ]);

  // Compose the projection using pure domain function
  return buildMonthlyProjection({
    month,
    entradas: txnTotals.entradas,
    saidasAvulsas: txnTotals.saidas,
    parcelasDoMes: commitmentSum,
  });
}
