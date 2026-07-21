import { z } from "zod";
import { isDateInRange } from "@/shared";
import {
  MIN_INSTALLMENT_COUNT,
  MAX_INSTALLMENT_COUNT,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MIN_DATE_STRING,
  INVALID_INSTALLMENT_COUNT_ERROR,
  INVALID_DESCRIPTION_ERROR,
  INVALID_FIRST_DUE_DATE_ERROR,
} from "./constants";

// Max date: 100 years from today
const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() + 100);
const MAX_DATE_STRING = maxDate.toISOString().split("T")[0];

const dateSchema = z.string().refine(
  (val) => {
    try {
      return isDateInRange(val, MIN_DATE_STRING, MAX_DATE_STRING);
    } catch {
      return false;
    }
  },
  { message: INVALID_FIRST_DUE_DATE_ERROR }
);

const installmentCountSchema = z.coerce
  .number()
  .int()
  .min(MIN_INSTALLMENT_COUNT, { message: INVALID_INSTALLMENT_COUNT_ERROR })
  .max(MAX_INSTALLMENT_COUNT, { message: INVALID_INSTALLMENT_COUNT_ERROR });

const descriptionSchema = z.string().trim().min(MIN_DESCRIPTION_LENGTH).max(MAX_DESCRIPTION_LENGTH, {
  message: INVALID_DESCRIPTION_ERROR,
});

const amountRawSchema = z.string().min(1, "Valor não pode estar vazio");

export const createCommitmentInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("installment_payment"),
    total: amountRawSchema,
    installmentValue: z.literal(undefined).optional(),
    installmentCount: installmentCountSchema,
    firstDueDate: dateSchema,
    description: descriptionSchema,
    categoryId: z.string().min(1),
  }),
  z.object({
    mode: z.literal("fixed_payment"),
    total: z.literal(undefined).optional(),
    installmentValue: amountRawSchema,
    installmentCount: installmentCountSchema,
    firstDueDate: dateSchema,
    description: descriptionSchema,
    categoryId: z.string().min(1),
  }),
]);

export const updateCommitmentInputSchema = z
  .object({
    total: amountRawSchema.optional(),
    installmentValue: amountRawSchema.optional(),
    installmentCount: installmentCountSchema.optional(),
    firstDueDate: dateSchema.optional(),
    description: descriptionSchema.optional(),
    categoryId: z.string().min(1).optional(),
    scope: z.enum(["todas", "futuras"] as const).optional().default("todas"),
  })
  .refine((data) => !(data.total && data.installmentValue), {
    message: "Apenas um entre total e installmentValue pode ser fornecido",
  });

export const setInstallmentStatusSchema = z.object({
  installmentId: z.string().min(1),
  status: z.enum(["prevista", "paga"] as const),
});

export type CreateCommitmentInput = z.infer<typeof createCommitmentInputSchema>;
export type UpdateCommitmentInput = z.infer<typeof updateCommitmentInputSchema>;
export type SetInstallmentStatusInput = z.infer<typeof setInstallmentStatusSchema>;
