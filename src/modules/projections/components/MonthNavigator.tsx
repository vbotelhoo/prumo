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

  return (
    <div className="flex items-center justify-between gap-4">
      <Link href={`?month=${prev}`}>
        <Button variant="outline" size="sm">
          ← Mês Anterior
        </Button>
      </Link>

      <h2 className="flex-1 text-center font-heading text-lg font-semibold capitalize text-foreground">
        {formatMonthLabel(month)}
      </h2>

      <Link href={`?month=${next}`}>
        <Button variant="outline" size="sm">
          Próximo Mês →
        </Button>
      </Link>

      {!isCurrentMonth && (
        <Link href={`?month=${getCurrentMonth()}`}>
          <Button variant="ghost" size="sm">
            Voltar ao Mês Atual
          </Button>
        </Link>
      )}
    </div>
  );
}
