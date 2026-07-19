"use client";

import { Button, formatBRL } from "@/shared";
import type { Transaction } from "../domain/types";

type TransactionListProps = {
  items: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

/**
 * TransactionList renders a list of transactions with visual distinction
 * for entrada (green) and saída (red) values.
 */
export function TransactionList({ items, onEdit, onDelete }: TransactionListProps) {
  return (
    <div className="space-y-2">
      {items.map((txn) => {
        const isEntrada = txn.type === "entrada";
        const valueColor = isEntrada ? "text-green-600" : "text-red-600";
        const valuePrefix = isEntrada ? "+ " : "- ";
        const formattedDate = new Date(txn.date).toLocaleDateString("pt-BR");
        const description = txn.description || "—";

        return (
          <div
            key={txn.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{formattedDate}</span>
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    {isEntrada ? "Entrada" : "Saída"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {txn.categoryName}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 ml-4">
              <div className={`font-semibold whitespace-nowrap ${valueColor}`}>
                {valuePrefix}
                {formatBRL(txn.amount)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(txn)}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(txn)}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
