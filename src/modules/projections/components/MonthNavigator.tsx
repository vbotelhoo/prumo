import Link from "next/link";
import { Button } from "@/shared";
import { previousMonth, nextMonth, getCurrentMonth, formatMonthLabel } from "../domain/month";

/**
 * MonthNavigator: navegação entre meses no mesmo padrão de card/tipografia
 * das demais páginas (POLISH-15) — título Title-like centralizado, ações
 * secundárias (`outline`/`ghost`) nas bordas, só tokens.
 */
export function MonthNavigator({ month }: { month: string }) {
  const isCurrentMonth = month === getCurrentMonth();
  const prev = previousMonth(month);
  const next = nextMonth(month);
  // Capitaliza só a primeira letra (harden pass, T16): CSS `capitalize`
  // (text-transform) maiusculiza CADA palavra, então "julho de 2026" virava
  // "Julho De 2026" — errado em pt-BR (preposição no meio da frase não é
  // maiúscula). `formatMonthLabel` continua em minúsculas (mesma string
  // usada, sem capitalize, dentro da frase do DashboardHero).
  const rawLabel = formatMonthLabel(month);
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  return (
    // POLISH-17: os botões usam `shrink-0` (Button primitive) e não cabem
    // lado a lado com o título em 320px — em telas <sm empilha em coluna
    // (mesmo padrão do header do dashboard); a partir de sm volta à linha
    // única original.
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
      <Link href={`?month=${prev}`}>
        <Button variant="outline" size="sm" className="max-sm:min-h-11">
          ← Mês Anterior
        </Button>
      </Link>

      <h2 className="text-center font-heading text-lg font-semibold text-foreground sm:flex-1">
        {monthLabel}
      </h2>

      <Link href={`?month=${next}`}>
        <Button variant="outline" size="sm" className="max-sm:min-h-11">
          Próximo Mês →
        </Button>
      </Link>

      {!isCurrentMonth && (
        <Link href={`?month=${getCurrentMonth()}`}>
          <Button variant="ghost" size="sm" className="max-sm:min-h-11">
            Voltar ao Mês Atual
          </Button>
        </Link>
      )}
    </div>
  );
}
