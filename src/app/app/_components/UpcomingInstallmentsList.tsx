"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, formatBRL, formatDateBR } from "@/shared";
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
          // POLISH-17 (harden pass, T16): a linha inteira (desc + categoria/
          // data + valor + botão) não cabia lado a lado em 320px — o valor e
          // o botão (`shrink-0`) sobravam quase toda a largura, esmagando a
          // descrição em "N…" e colidindo visualmente com a data. Empilha em
          // coluna abaixo de sm, volta à linha única a partir daí.
          className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{installment.description}</div>
            {/* Data de vencimento nunca trunca (harden pass, roadmap item 9
            T16): antes ficava na mesma linha truncável do nome da categoria
            e cortava a data ISO crua no meio ("vence em 2…"); agora só o
            nome da categoria encolhe, e a data sempre aparece por inteiro.
            `formatDateBR` evita o bug de fuso de `new Date(iso).toLocaleDateString()`
            (achado no mesmo pass, também corrigido em TransactionList). */}
            <div className="flex min-w-0 gap-1 text-sm text-muted-foreground">
              <span className="truncate">{installment.categoryName}</span>
              <span className="shrink-0">
                · vence em {formatDateBR(installment.dueDate)}
              </span>
            </div>
            {errors[installment.installmentId] && (
              <div className="text-sm text-destructive">{errors[installment.installmentId]}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
            <div className="text-right font-semibold tabular-nums text-foreground">
              {formatBRL(installment.amount)}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="max-sm:min-h-11"
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
