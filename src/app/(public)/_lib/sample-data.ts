/**
 * Sample data fixture for landing page mockups.
 *
 * All values in centavos (integers). Invariants verified by unit tests:
 * - sum(installmentsCents) === totalCents
 * - projectedBalanceCents === incomeCents − expensesCents
 *
 * First installment absorbs rounding difference (AD-009) to maintain
 * exact arithmetic.
 */

export interface SampleInstallmentPlan {
  description: string;
  totalCents: number;
  installmentsCents: number[];
  paidCount: number;
}

export interface SampleMonthProjection {
  monthLabel: string;
  incomeCents: number;
  expensesCents: number;
  projectedBalanceCents: number;
}

/**
 * Realistic installment plan: laptop purchase
 * Total: R$ 1.500,00 (150.000 centavos) over 11 months
 * First installment absorbs rounding: 13.640 centavos
 * Remaining 10 installments: 13.636 centavos each
 * Invariant: 13.640 + (10 × 13.636) = 150.000 ✓
 */
export const SAMPLE_INSTALLMENT_PLAN: SampleInstallmentPlan = {
  description: "Notebook em 11 parcelas",
  totalCents: 150_000,
  installmentsCents: [
    13_640, // First installment absorbs rounding
    13_636,
    13_636,
    13_636,
    13_636,
    13_636,
    13_636,
    13_636,
    13_636,
    13_636,
    13_636,
  ],
  paidCount: 2, // User has paid 2 out of 11 installments
};

/**
 * Sample monthly projections: showing income, expenses, and projected balance
 * for six months. All values in centavos (integers).
 *
 * Invariant: projectedBalanceCents = incomeCents − expensesCents
 */
export const SAMPLE_MONTH_PROJECTIONS: SampleMonthProjection[] = [
  {
    monthLabel: "Agosto",
    incomeCents: 500_000, // R$ 5.000,00
    expensesCents: 350_000, // R$ 3.500,00 (includes one installment: 13.636)
    projectedBalanceCents: 150_000, // R$ 1.500,00
  },
  {
    monthLabel: "Setembro",
    incomeCents: 500_000,
    expensesCents: 350_000,
    projectedBalanceCents: 150_000,
  },
  {
    monthLabel: "Outubro",
    incomeCents: 500_000,
    expensesCents: 350_000,
    projectedBalanceCents: 150_000,
  },
  {
    monthLabel: "Novembro",
    incomeCents: 500_000,
    expensesCents: 350_000,
    projectedBalanceCents: 150_000,
  },
  {
    monthLabel: "Dezembro",
    incomeCents: 500_000,
    expensesCents: 350_000,
    projectedBalanceCents: 150_000,
  },
  {
    monthLabel: "Janeiro",
    incomeCents: 500_000,
    expensesCents: 350_000,
    projectedBalanceCents: 150_000,
  },
];
