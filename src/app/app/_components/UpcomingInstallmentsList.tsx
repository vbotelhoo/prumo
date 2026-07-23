"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, formatBRL } from "@/shared";
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
      <div className="flex items-center justify-center h-32 text-sm text-gray-500">
        Nenhuma parcela pendente este mês
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
    <ul className="divide-y">
      {installments.map((installment) => (
        <li
          key={installment.installmentId}
          className="flex items-center justify-between gap-4 py-3"
        >
          <div>
            <div className="font-medium">{installment.description}</div>
            <div className="text-sm text-gray-500">
              {installment.categoryName} · vence em {installment.dueDate}
            </div>
            {errors[installment.installmentId] && (
              <div className="text-sm text-destructive">
                {errors[installment.installmentId]}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="font-semibold">{formatBRL(installment.amount)}</div>
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
