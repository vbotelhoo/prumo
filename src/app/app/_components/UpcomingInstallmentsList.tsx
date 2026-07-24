"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, formatBRL } from "@/shared";
import type { Money } from "@/shared";
import { setInstallmentStatusAction } from "@/modules/commitments";

export interface UpcomingInstallment {
  installmentId: string;
  commitmentId: string;
  description: string;
  categoryName: string;
  amount: Money;
  dueDate: string;
}

export function UpcomingInstallmentsList({
  installments,
}: {
  readonly installments: UpcomingInstallment[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (installments.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <EmptyState title="Nenhuma parcela pendente este mês" />
      </div>
    );
  }

  const handleMarkAsPaid = (installmentId: string) => {
    setErrors((prev) => {
      const rest = { ...prev };
      delete rest[installmentId];
      return rest;
    });

    startTransition(async () => {
      const result = await setInstallmentStatusAction({ installmentId, status: "paga" });
      if (result.ok) {
        router.refresh();
      } else {
        setErrors((prev) => ({ ...prev, [installmentId]: result.error }));
      }
    });
  };

  return (
    <ul className="divide-y divide-border">
      {installments.map((installment) => (
        <li
          key={installment.installmentId}
          className="flex items-center justify-between gap-4 py-3"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{installment.description}</div>
            <div className="truncate text-sm text-muted-foreground">
              {installment.categoryName} · vence em {installment.dueDate}
            </div>
            {errors[installment.installmentId] && (
              <div className="text-sm text-destructive">{errors[installment.installmentId]}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right font-semibold tabular-nums text-foreground">
              {formatBRL(installment.amount)}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleMarkAsPaid(installment.installmentId)}
            >
              Marcar como paga
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
