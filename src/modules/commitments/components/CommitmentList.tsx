"use client";

import { useState } from "react";
import { Button, Progress, Card, CardContent, CardHeader, CardTitle } from "@/shared";
import { formatBRL } from "@/shared";
import type { Commitment } from "../domain/types";
import { computeCommitmentProgress } from "../domain/installments";
import { CommitmentsEmptyState } from "./CommitmentsEmptyState";

interface CommitmentListProps {
  commitments: Commitment[];
  onEdit?: (commitment: Commitment) => void;
  onDelete?: (commitment: Commitment) => void;
  onToggleInstallment?: (installmentId: string, status: "prevista" | "paga") => void;
}

export function CommitmentList({
  commitments,
  onEdit,
  onDelete,
  onToggleInstallment,
}: CommitmentListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (commitments.length === 0) {
    return <CommitmentsEmptyState />;
  }

  return (
    <div className="space-y-4">
      {commitments.map((commitment) => {
        const progress = computeCommitmentProgress(commitment.installments || []);
        const isExpanded = expandedId === commitment.id;

        return (
          <Card key={commitment.id}>
            <CardHeader className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : commitment.id)}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-base">{commitment.description}</CardTitle>
                  <p className="text-sm text-gray-500">{commitment.categoryName}</p>
                </div>
                {progress.isSettled && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Quitado
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Parcelas</p>
                  <p className="font-semibold">{progress.paidCount}/{progress.totalCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Valor Total</p>
                  <p className="font-semibold">{formatBRL(commitment.total as any)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Já Pago</p>
                  <p className="font-semibold text-green-600">{formatBRL(progress.amountPaid as any)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Saldo</p>
                  <p className="font-semibold text-orange-600">{formatBRL(progress.amountRemaining as any)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">{progress.percentPaid}% pago</p>
                <Progress value={progress.percentPaid} className="h-2" />
              </div>

              {isExpanded && commitment.installments && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <h4 className="font-semibold text-sm">Parcelas</h4>
                  {commitment.installments.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100"
                      onClick={() =>
                        onToggleInstallment?.(inst.id, inst.status === "paga" ? "prevista" : "paga")
                      }
                    >
                      <div className="flex-1">
                        <span className="font-semibold">{inst.number}/{progress.totalCount}</span>
                        <span className="text-gray-500 ml-2">{inst.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{formatBRL(inst.amount as any)}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            inst.status === "paga"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {inst.status === "paga" ? "✓ Paga" : "Prevista"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => onEdit?.(commitment)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDelete?.(commitment)}>
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
