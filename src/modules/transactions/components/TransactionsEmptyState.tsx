"use client";

import { Button } from "@/shared";

type TransactionsEmptyStateProps = {
  onAddNew: () => void;
};

/**
 * TransactionsEmptyState renders the empty state when no transactions exist,
 * with a CTA button to create the first transaction.
 */
export function TransactionsEmptyState({ onAddNew }: TransactionsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-gray-600 dark:text-gray-400">Nenhuma transação registrada</p>
      <Button onClick={onAddNew}>Registrar primeira transação</Button>
    </div>
  );
}
