"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  formatBRL,
  formatDateBR,
  Progress,
} from "@/shared";
import type { Commitment } from "../domain/types";
import { computeCommitmentProgress } from "../domain/installments";

interface CommitmentListProps {
  commitments: Commitment[];
  onEdit?: (commitment: Commitment) => void;
  onDelete?: (commitment: Commitment) => void;
  onToggleInstallment?: (installmentId: string, status: "prevista" | "paga") => void;
}

/**
 * CommitmentList: um card por compromisso com progresso de quitação legível
 * de relance (POLISH-14) — "N/M pagas" + barra `Progress`. Estados de
 * parcela (prevista/paga) e o badge "Quitado" ficam neutros (tokens
 * muted/foreground): DESIGN.md reserva verde estritamente a Entrada e
 * vermelho a Saída/comprometido — nenhum dos dois é "Já Pago" ou um estado
 * de quitação, então a distinção vem de peso/ícone, não de matiz (regra
 * "Semântica Só em Número"). "Saldo" (valor ainda comprometido) usa a
 * mesma semântica de Saída do StatCard "Total comprometido" do dashboard.
 */
export function CommitmentList({
  commitments,
  onEdit,
  onDelete,
  onToggleInstallment,
}: CommitmentListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (commitments.length === 0) {
    return (
      <EmptyState
        title="Nenhum compromisso ainda"
        description="Crie seu primeiro compromisso (compra parcelada ou financiamento) para começar a acompanhar suas parcelas."
      />
    );
  }

  return (
    <div className="space-y-4">
      {commitments.map((commitment) => {
        const progress = computeCommitmentProgress(commitment.installments || []);
        const isExpanded = expandedId === commitment.id;

        return (
          <Card key={commitment.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : commitment.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{commitment.description}</CardTitle>
                  <p className="text-sm text-muted-foreground">{commitment.categoryName}</p>
                </div>
                {progress.isSettled && (
                  <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-foreground">
                    ✓ Quitado
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Parcelas pagas</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {progress.paidCount}/{progress.totalCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatBRL(commitment.total)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Já Pago</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatBRL(progress.amountPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saldo</p>
                  <p className="font-semibold tabular-nums text-negative">
                    {formatBRL(progress.amountRemaining)}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {progress.percentPaid}% pago
                </p>
                <Progress value={progress.percentPaid} className="h-2" />
              </div>

              {isExpanded && commitment.installments && (
                <ul className="mt-4 space-y-2 border-t border-border pt-4">
                  <li className="sr-only">Parcelas de {commitment.description}</li>
                  {commitment.installments.map((inst) => {
                    const isPaga = inst.status === "paga";
                    return (
                      <li
                        key={inst.id}
                        className="flex items-center justify-between gap-3 rounded bg-muted/50 p-2 text-sm"
                      >
                        <div className="flex-1">
                          <span className="font-semibold text-foreground">
                            Parcela {inst.number} de {progress.totalCount}
                          </span>
                          {/* formatDateBR (roadmap item 9, T16 harden pass):
                          antes mostrava a data ISO crua ("2026-07-24") em vez
                          de pt-BR, inconsistente com o resto do produto (AD-014). */}
                          <span className="ml-2 text-muted-foreground">
                            {formatDateBR(inst.dueDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-foreground">
                            {formatBRL(inst.amount)}
                          </span>
                          <span
                            className={
                              isPaga
                                ? "rounded bg-muted px-2 py-1 text-xs font-medium text-foreground"
                                : "rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                            }
                          >
                            {isPaga ? "✓ Paga" : "Prevista"}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="max-sm:min-h-11"
                            onClick={() =>
                              onToggleInstallment?.(inst.id, isPaga ? "prevista" : "paga")
                            }
                          >
                            {isPaga ? "Marcar como prevista" : "Marcar como paga"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="max-sm:min-h-11"
                  onClick={() => onEdit?.(commitment)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="max-sm:min-h-11"
                  onClick={() => onDelete?.(commitment)}
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
