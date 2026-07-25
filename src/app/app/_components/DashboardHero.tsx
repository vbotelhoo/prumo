import { formatBRL, type Money } from "@/shared";

interface DashboardHeroProps {
  readonly userName: string;
  readonly month: string;
  readonly saldoProjetado: Money;
}

// Herói do dashboard (POLISH-05/06, spec.md P1 Dashboard AC1/AC2): o saldo
// projetado do mês é o único número Display do viewport — saudação some
// para papel secundário. Cor semântica só no número (DESIGN.md, Semântica
// Só em Número): negativo usa `text-negative`, positivo/zero usa a cor de
// texto primária (não `text-positive` — AC2 permite "primária ou Entrada" e
// primária evita colorir qualquer saldo positivo de verde, reservando
// verde para deltas/entradas específicas). O sinal "−" é emitido pelo próprio
// `Intl.NumberFormat` de `formatBRL` dentro do bloco `tabular-nums`, então
// a largura tabular já o inclui (edge case do spec).
export function DashboardHero({ userName, month, saldoProjetado }: DashboardHeroProps) {
  const isNegativo = saldoProjetado < 0;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">
        Olá, <span className="font-medium text-foreground">{userName}</span> — {month}
      </p>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">Saldo projetado</p>
      <p
        data-testid="dashboard-hero-saldo"
        className={
          "font-heading text-4xl font-semibold leading-[1.1] tabular-nums sm:text-5xl " +
          (isNegativo ? "text-negative" : "text-foreground")
        }
      >
        {formatBRL(saldoProjetado)}
      </p>
    </div>
  );
}
