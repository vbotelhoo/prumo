/**
 * HeroPreview: Mockup da projeção mensal/dashboard recriada com primitivos.
 *
 * Componente presentacional que exibe dados de exemplo (fixture) em uma
 * visualização realista do que o usuário verá no app. Decoração usa
 * aria-hidden + alternativa textual acessível.
 *
 * LAND-02, LAND-05: mockup com dados da fixture, legível nos dois temas,
 * todos os valores inteiros em centavos.
 */

import { Card, CardContent, CardDescription, CardHeader, formatBRL, money } from "@/shared";
import { SAMPLE_MONTH_PROJECTIONS } from "../_lib/sample-data";

export function HeroPreview() {
  // Mostra 3 primeiros meses da projeção
  const projections = SAMPLE_MONTH_PROJECTIONS.slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      {/* Card principal: exemplo de projeção mensal */}
      <Card className="w-full border border-border">
        <CardHeader className="pb-3">
          <h2 className="text-sm font-medium text-foreground">Projeção Mensal</h2>
          <CardDescription className="text-xs">Exemplo dos próximos meses</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabela de projeção: valores alinhados com font-variant-numeric */}
          <div className="space-y-2">
            {projections.map((proj, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-b-0">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">{proj.monthLabel}</p>
                </div>
                <div className="flex gap-6 font-variant-numeric tabular-nums text-xs">
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-muted-foreground">Entradas</p>
                    <p className="font-medium text-entrada-verde">
                      {formatBRL(money(proj.incomeCents))}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-muted-foreground">Saídas</p>
                    <p className="font-medium text-saida-vermelho">
                      {formatBRL(money(proj.expensesCents))}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-muted-foreground">Saldo</p>
                    <p className="font-semibold text-foreground">
                      {formatBRL(money(proj.projectedBalanceCents))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card secundário: resumo de parcelas (decorativo com alternativa textual) */}
      <Card className="border border-border bg-muted/30">
        <CardHeader className="pb-3">
          <h3 className="text-sm font-medium">Parcelas Ativas</h3>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center gap-3 font-variant-numeric tabular-nums"
            aria-label="Resumo de parcelas ativas: Notebook em 11 parcelas, 2 pagas, 150 reais restante por parcela"
          >
            {/* Ícone decorativo com aria-hidden */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13 9h-2V7h2m0 10h-2v-2h2m-6-8H4v15a2 2 0 002 2h12a2 2 0 002-2V3h-3V1h-2v2H8V1H6v2z" />
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-foreground">Notebook em 11x</p>
              <p className="text-xs text-muted-foreground">
                2 pagas de 11 • R$ 150 por parcela
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
