import type { Money } from "@/shared";
import { parseDate, addMonths, getLastDayOfMonth } from "@/shared";
import {
  INSTALLMENT_VALUE_TOO_SMALL_ERROR,
  MIN_AMOUNT_CENTS,
} from "./constants";
import type { Installment } from "./types";

/**
 * Split a total amount into N equal parts, with remainder distributed to the first installment.
 * Invariant: sum of all parts equals total (AD-009).
 * @param total - amount in cents
 * @param count - number of installments (N >= 2)
 * @returns array of amounts in cents
 */
export function splitInstallments(total: Money, count: number): Money[] {
  if (count < 2) throw new Error("Count must be >= 2");

  const baseAmount = Math.floor(total / count);
  const remainder = total % count;

  if (baseAmount < MIN_AMOUNT_CENTS) {
    throw new Error(INSTALLMENT_VALUE_TOO_SMALL_ERROR);
  }

  const amounts: Money[] = [];
  for (let i = 0; i < count; i++) {
    // First installment gets the remainder
    amounts.push((i === 0 ? baseAmount + remainder : baseAmount) as Money);
  }

  return amounts;
}

/**
 * Generate monthly due dates starting from firstDueDate.
 * If the day doesn't exist in a month (e.g., 31st in Feb), clamp to last day of month.
 * @param firstDueDate - "YYYY-MM-DD"
 * @param count - number of dates to generate
 * @returns array of "YYYY-MM-DD" strings
 */
export function scheduleDueDates(firstDueDate: string, count: number): string[] {
  const startDate = parseDate(firstDueDate);
  const dayOfMonth = startDate.getDate();

  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = addMonths(startDate, i);

    // Clamp to last day of month if the original day doesn't exist
    const lastDay = getLastDayOfMonth(date);
    if (dayOfMonth > lastDay.getDate()) {
      date.setDate(lastDay.getDate());
    }

    dates.push(formatDateIso(date));
  }

  return dates;
}

/**
 * Materialize installments for a new commitment.
 * For installment_payment mode: splits the total amount.
 * For fixed_payment mode: all installments have the same amount (total = amount * count).
 */
export function materializeInstallments(
  total: Money,
  count: number,
  firstDueDate: string,
  mode: "installment_payment" | "fixed_payment"
): Array<{
  number: number;
  amount: Money;
  dueDate: string;
  status: "prevista";
}> {
  const amounts =
    mode === "installment_payment"
      ? splitInstallments(total, count)
      : new Array(count).fill(total / count).map(() => total / count as Money);

  const dueDates = scheduleDueDates(firstDueDate, count);

  return dueDates.map((dueDate, i) => ({
    number: i + 1,
    amount: amounts[i] as Money,
    dueDate,
    status: "prevista" as const,
  }));
}

/**
 * Regenerate installments for an update, respecting frozen (paid) installments.
 * Returns the new installments to persist (prevista only, renumbered by dueDate order).
 * Validates invariants: sum(paid)+sum(new previstas) == new total, each amount >= MIN_AMOUNT_CENTS.
 * @param newTotal - new total in cents
 * @param newCount - new number of installments
 * @param newFirstDueDate - new first due date (applies to prevista only; paid keep original)
 * @param existingInstallments - current installments (mixed paid/prevista)
 * @param scope - "todas" (regenerate all prevista) or "futuras" (only future prevista, before today)
 * @returns new prevista installments (renumbered) if valid, or error message
 */
export function regeneratePrevistaInstallments(
  newTotal: Money,
  newCount: number,
  newFirstDueDate: string,
  existingInstallments: Installment[],
  _scope: "todas" | "futuras" = "todas"
): { success: false; error: string } | { success: true; regenerated: Array<{
  number: number;
  amount: Money;
  dueDate: string;
  status: "prevista";
}> } {
  const paidInstallments = existingInstallments.filter((inst) => inst.status === "paga");
  const paidTotal = paidInstallments.reduce(
    (sum, inst) => (sum + inst.amount) as Money,
    0 as Money
  );

  // Check invariant: new total >= sum of paid
  if (newTotal < paidTotal) {
    return {
      success: false,
      error: "Novo valor total não pode ser menor que a soma das parcelas já pagas",
    };
  }

  // Check invariant: new count >= number of paid
  if (newCount < paidInstallments.length) {
    return {
      success: false,
      error: "Novo número de parcelas não pode ser menor que as parcelas já pagas",
    };
  }

  // Calculate the new total for prevista (new total - already paid)
  const remainingTotal = (newTotal - paidTotal) as Money;

  // Split remaining total among new count - paid count
  const previstCountTarget = newCount - paidInstallments.length;

  if (previstCountTarget < 0) {
    return {
      success: false,
      error: "Novo número de parcelas não pode ser menor que as parcelas já pagas",
    };
  }

  let newPrevistaAmounts: Money[];
  try {
    newPrevistaAmounts = splitInstallments(remainingTotal, previstCountTarget);
  } catch {
    return {
      success: false,
      error: "Valor de parcela resultante é menor que R$ 0,01",
    };
  }

  // Generate new due dates for regenerated prevista
  const newDueDates = scheduleDueDates(newFirstDueDate, newCount);

  // Assign new amounts to regenerated prevista in order
  const regenerated = newDueDates
    .slice(paidInstallments.length) // Skip dates used by paid installments
    .map((dueDate, i) => ({
      number: i + paidInstallments.length + 1,
      amount: newPrevistaAmounts[i],
      dueDate,
      status: "prevista" as const,
    }));

  return { success: true, regenerated };
}

/**
 * Compute progress metrics for a commitment.
 */
export function computeCommitmentProgress(
  installments: Installment[]
): {
  paidCount: number;
  totalCount: number;
  amountPaid: Money;
  amountRemaining: Money;
  percentPaid: number;
  isSettled: boolean;
} {
  const totalCount = installments.length;
  const paidInstallments = installments.filter((inst) => inst.status === "paga");
  const paidCount = paidInstallments.length;

  const amountPaid = paidInstallments.reduce(
    (sum, inst) => (sum + inst.amount) as Money,
    0 as Money
  );
  const amountRemaining = installments.reduce(
    (sum, inst) =>
      (sum + (inst.status === "prevista" ? inst.amount : 0)) as Money,
    0 as Money
  );

  const percentPaid = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const isSettled = paidCount === totalCount && totalCount > 0;

  return {
    paidCount,
    totalCount,
    amountPaid,
    amountRemaining,
    percentPaid,
    isSettled,
  };
}

// Helper: format Date to ISO string (YYYY-MM-DD)
function formatDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}
