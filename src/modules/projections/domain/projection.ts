import { addMoney, subtractMoney } from "@/shared";
import type { Money } from "@/shared";
import type { MonthlyProjection } from "./types";

export function buildMonthlyProjection(input: {
  month: string;
  entradas: Money;
  saidasAvulsas: Money;
  parcelasDoMes: Money;
}): MonthlyProjection {
  const saidasPrevistas = addMoney(input.saidasAvulsas, input.parcelasDoMes);
  const saldoProjetado = subtractMoney(input.entradas, saidasPrevistas);

  return {
    month: input.month,
    entradasPrevistas: input.entradas,
    saidasPrevistas,
    saldoProjetado,
    totalComprometido: input.parcelasDoMes,
  };
}
