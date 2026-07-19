import { z } from "zod";
import type { CreateCategoryInput } from "./types";

export const categoryTypeSchema = z.enum(["entrada", "saida"]);

export const createCategoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(40, "Máximo 40 caracteres"),
  type: categoryTypeSchema,
}) satisfies z.ZodType<CreateCategoryInput>;
