import { addMoney } from "@/shared";
import type { Money } from "@/shared";

export interface CategorySpendingSlice {
  categoryId: string;
  categoryName: string;
  total: Money;
}

/**
 * Combina totais de gastos por categoria vindos de transações avulsas e
 * de parcelas de compromissos, somando por categoryId (nunca por nome —
 * DASH-18). Ordena o resultado por total decrescente.
 */
export function mergeCategorySpending(
  transactionTotals: CategorySpendingSlice[],
  commitmentTotals: CategorySpendingSlice[]
): CategorySpendingSlice[] {
  const totalsByCategory = new Map<string, CategorySpendingSlice>();

  for (const slice of [...transactionTotals, ...commitmentTotals]) {
    const existing = totalsByCategory.get(slice.categoryId);
    totalsByCategory.set(slice.categoryId, {
      categoryId: slice.categoryId,
      categoryName: slice.categoryName,
      total: existing ? addMoney(existing.total, slice.total) : slice.total,
    });
  }

  return Array.from(totalsByCategory.values()).sort((a, b) => b.total - a.total);
}
