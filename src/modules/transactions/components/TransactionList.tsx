"use client";

import { Button, formatBRL, formatDateBR } from "@/shared";
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
        // `formatDateBR` (roadmap item 9, T16 harden pass): evita o bug de
        // `new Date(iso).toLocaleDateString()` mostrar um dia a menos em
        // fusos negativos (ex.: America/Sao_Paulo, UTC-3 — o mercado do
        // produto, AD-014), já que `date` é uma data-calendário pura
        // (YYYY-MM-DD, sem componente de hora).
        const formattedDate = formatDateBR(txn.date);
        const description = txn.description || "—";

        return (
          // POLISH-17 (harden pass, T16): em 320px o valor + Editar + Excluir
          // (`shrink-0`) tomavam quase toda a largura da linha, esmagando a
          // categoria/descrição (`min-w-0`) a poucos caracteres. Empilha em
          // coluna abaixo de sm — mesmo padrão do dashboard.
          <li
            key={txn.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
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

            <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
              <div className={`text-right font-semibold tabular-nums ${valueClass}`}>
                {valuePrefix}
                {formatBRL(txn.amount)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="max-sm:min-h-11"
                  onClick={() => onEdit(txn)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="max-sm:min-h-11"
                  onClick={() => onDelete(txn)}
                >
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
