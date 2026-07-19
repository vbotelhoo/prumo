import { z } from "zod";
import type { TransactionInput } from "./types";

const MIN_DATE = "2000-01-01";

function maxDate(): string {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setFullYear(futureDate.getFullYear() + 100);
  return futureDate.toISOString().split("T")[0];
}

export const transactionTypeSchema = z.enum(["entrada", "saida"]);

export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .refine(
      (d) => d >= MIN_DATE && d <= maxDate(),
      "Data fora do intervalo permitido"
    ),
  amountRaw: z.string().min(1, "Valor obrigatório"),
  description: z
    .string()
    .trim()
    .max(140, "Máximo 140 caracteres")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v?.trim() || undefined)),
  categoryId: z.string().min(1, "Categoria obrigatória"),
}) satisfies z.ZodType<TransactionInput>;
