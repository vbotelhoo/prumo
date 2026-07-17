import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/shared";

// Instância Better Auth (design.md, componente 1; spec.md AC-3 da story
// Persistência): adapter Prisma + e-mail/senha habilitado. Named export
// `auth` exigido pelo CLI do Better Auth (Risks & Concerns do design).
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Piso mínimo no Better Auth; regras de complexidade (maiúscula,
    // dígito, especial) ficam no Zod do domínio (AUTH-02), não aqui.
    minPasswordLength: 8,
  },
  user: {
    // Perfil cadastral do usuário (AUTH-04) — Abordagem A / AD-015:
    // persistido como additionalFields do próprio User, não em tabela
    // separada. Todos `{ type: "string" }`: os tipos oficiais do Better
    // Auth são string/number/boolean/date/json; datas ficam como string
    // ISO para não inventar um tipo `date` fora do que o BA documenta.
    additionalFields: {
      cpf: { type: "string" },
      birthDate: { type: "string" }, // YYYY-MM-DD
      zipCode: { type: "string" },
      street: { type: "string" },
      addressNumber: { type: "string" },
      complement: { type: "string", required: false },
      neighborhood: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      // ISO datetime do aceite de termos. `input: false`: nunca pode vir
      // do body de `signUpEmail`, nem em chamada server-side — ver nota
      // técnica abaixo sobre `databaseHooks.user.create.before`.
      termsAcceptedAt: { type: "string", input: false },
    },
  },
  // Único caminho válido para setar `termsAcceptedAt` (design.md,
  // componente 1 / Risks & Concerns): confirmado no código-fonte do Better
  // Auth 1.6.23 (`db/schema.mjs`, `parseInputData`) que um campo com
  // `input: false` presente com valor truthy no body de `signUpEmail`
  // sempre lança `FIELD_NOT_ALLOWED` — o filtro não distingue origem
  // "cliente" de "server confiável", só olha se o campo veio no body. Este
  // hook roda depois desse filtro, direto sobre os dados que vão para o
  // adapter, por isso contorna o `input: false` sem violá-lo.
  databaseHooks: {
    user: {
      create: {
        before: async () => ({
          data: { termsAcceptedAt: new Date().toISOString() },
        }),
      },
    },
  },
});
