"use client";

import { Button, formatBRL } from "@/shared";
import type { Transaction } from "../domain/types";

type TransactionListProps = {
  items: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

/**
 * TransactionList renders a list of transactions. Segue a regra "Semântica
 * Só em Número" do DESIGN.md: a cor de Entrada/Saída colore apenas o valor
 * (tabular, alinhado à direita) — o badge de tipo permanece neutro. Nomes
 * de categoria/descrição truncam com reticências sem quebrar o alinhamento
 * da coluna de valor (edge case do spec, `min-w-0` + `truncate`).
 */
export function TransactionList({ items, onEdit, onDelete }: TransactionListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map((txn) => {
        const isEntrada = txn.type === "entrada";
        const valueClass = isEntrada ? "text-positive" : "text-negative";
        const valuePrefix = isEntrada ? "+ " : "- ";
        const formattedDate = new Date(txn.date).toLocaleDateString("pt-BR");
        const description = txn.description || "—";

        return (
          <li key={txn.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formattedDate}</span>
                <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-muted text-foreground">
                  {isEntrada ? "Entrada" : "Saída"}
                </span>
              </div>
              <p className="truncate font-medium text-foreground">{txn.categoryName}</p>
              <p className="truncate text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <div className={`text-right font-semibold tabular-nums ${valueClass}`}>
                {valuePrefix}
                {formatBRL(txn.amount)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(txn)}>
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(txn)}>
                  Excluir
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
