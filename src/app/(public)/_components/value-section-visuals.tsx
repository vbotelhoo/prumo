/**
 * Mini-visuais para as três seções de valor da landing.
 *
 * Componentes presentacionais que ilustram cada pilar usando dados da fixture.
 * Não dependem de banco; reusam apenas helpers de shared.
 */

import { Card, CardContent, formatBRL, money } from "@/shared";
import { SAMPLE_INSTALLMENT_PLAN, SAMPLE_MONTH_PROJECTIONS } from "../_lib/sample-data";

/**
 * PrevisibilidadeVisual: Ilustra previsibilidade com uma visualização
 * de meses futuros mostrando saldo projetado.
 */
export function PrevisibilidadeVisual() {
  const months = SAMPLE_MONTH_PROJECTIONS.slice(0, 6);

  return (
    <Card className="border border-border">
      <CardContent className="pt-6">
        <div className="space-y-2">
          {months.map((month, idx) => (
            <div key={idx} className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-muted-foreground">{month.monthLabel}</p>
              <div className="flex items-center gap-2">
                {/* Barra visual do saldo (simplificado) */}
                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-entrada-verde"
                    style={{
                      width: `${Math.min(
                        (month.projectedBalanceCents / 200_000) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span className="font-variant-numeric tabular-nums text-xs font-medium text-foreground">
                  {formatBRL(money(month.projectedBalanceCents))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ParcelasVisual: Ilustra a parcela ativa com progresso.
 */
export function ParcelasVisual() {
  const plan = SAMPLE_INSTALLMENT_PLAN;
  const percentage = (plan.paidCount / plan.installmentsCents.length) * 100;

  return (
    <Card className="border border-border bg-muted/30">
      <CardContent className="space-y-4 pt-6">
        <div>
          <div className="mb-2 flex items-end justify-between">
            <p className="text-sm font-medium text-foreground">{plan.description}</p>
            <p className="text-xs text-muted-foreground">
              {plan.paidCount} de {plan.installmentsCents.length}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Parcela</p>
            <p className="font-variant-numeric tabular-nums font-semibold text-foreground">
              {formatBRL(money(plan.installmentsCents[0]))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Faltam</p>
            <p className="font-variant-numeric tabular-nums font-semibold text-entrada-verde">
              {plan.installmentsCents.length - plan.paidCount}x
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ProjecaoVisual: Ilustra a projeção mensal com entrada/saída/saldo.
 */
export function ProjecaoVisual() {
  const month = SAMPLE_MONTH_PROJECTIONS[0]; // Usa o primeiro mês

  return (
    <Card className="border border-border">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="font-variant-numeric tabular-nums font-medium text-entrada-verde">
              {formatBRL(money(month.incomeCents))}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Saídas</p>
            <p className="font-variant-numeric tabular-nums font-medium text-saida-vermelho">
              {formatBRL(money(month.expensesCents))}
            </p>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Saldo</p>
              <p className="font-variant-numeric tabular-nums text-lg font-semibold text-foreground">
                {formatBRL(money(month.projectedBalanceCents))}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
