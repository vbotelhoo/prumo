import type { Money } from "@/shared";

export type CommitmentMode = "installment_payment" | "fixed_payment";
export type InstallmentStatus = "prevista" | "paga";

export type Installment = {
  id: string;
  number: number; // 1 to N
  amount: Money;
  dueDate: string; // YYYY-MM-DD
  status: InstallmentStatus;
  commitmentId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Commitment = {
  id: string;
  mode: CommitmentMode;
  total: Money;
  installmentCount: number; // N in 2..360
  firstDueDate: string; // YYYY-MM-DD
  description: string;
  categoryId: string;
  categoryName: string; // join no repositório
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  installments?: Installment[];
};

export type CommitmentProgress = {
  paidCount: number;
  totalCount: number;
  amountPaid: Money;
  amountRemaining: Money;
  percentPaid: number;
  isSettled: boolean;
};

export type CreateCommitmentInput = {
  mode: CommitmentMode;
  total?: string; // for installment_payment: total value as BRL string
  installmentValue?: string; // for fixed_payment: fixed payment as BRL string
  installmentCount: number;
  firstDueDate: string;
  description: string;
  categoryId: string;
};

export type UpdateCommitmentInput = {
  total?: string; // only for installment_payment
  installmentValue?: string; // only for fixed_payment
  installmentCount?: number;
  firstDueDate?: string;
  description?: string;
  categoryId?: string;
  scope?: EditScope; // for value changes: which installments to affect
};

export type EditScope = "todas" | "futuras";

export type SetInstallmentStatusInput = {
  installmentId: string;
  status: InstallmentStatus;
};
