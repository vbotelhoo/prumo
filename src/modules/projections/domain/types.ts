import type { Money } from "@/shared";

export type MonthlyProjection = {
  month: string; // YYYY-MM
  entradasPrevistas: Money;
  saidasPrevistas: Money; // avulsas + parcelas do mês
  saldoProjetado: Money; // entradas − saídas; pode ser negativo
  totalComprometido: Money; // soma das parcelas do mês (qualquer status)
};
