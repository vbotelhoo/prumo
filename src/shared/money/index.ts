import { z } from "zod";

// Único caminho para representar/operar/formatar dinheiro no projeto
// (AD-008). Centavos inteiros, nunca float. Zero dependências de
// Next/React/Prisma neste diretório (regra 3 de fronteira do PROJECT.md).
export const moneySchema = z.number().int().finite().brand<"Money">();

export type Money = z.infer<typeof moneySchema>;

export function money(cents: number): Money {
  return moneySchema.parse(cents);
}

export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return money(a - b);
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(m: Money): string {
  return brlFormatter.format(m / 100);
}
