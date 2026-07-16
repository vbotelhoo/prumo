import { z } from "zod";

// Schema das env vars exigidas pela aplicação (design.md, componente 3;
// spec.md, story "Persistência" AC-4). `DATABASE_URL` e `BETTER_AUTH_URL`
// são URLs; `BETTER_AUTH_SECRET` é uma string não vazia (formato de secret
// não é padronizado por nenhuma lib específica).
const envSchema = z.object({
  DATABASE_URL: z.url({ message: "DATABASE_URL deve ser uma URL válida" }),
  BETTER_AUTH_SECRET: z
    .string()
    .min(1, { message: "BETTER_AUTH_SECRET não pode ser vazio" }),
  BETTER_AUTH_URL: z.url({ message: "BETTER_AUTH_URL deve ser uma URL válida" }),
});

export type Env = z.infer<typeof envSchema>;

// SPEC_DEVIATION: o design pede "parse na inicialização", mas o parse aqui é
// feito por uma função exportada (não no top-level do módulo) para que
// importar `shared` não valide env vars durante `next build`/`next dev`
// antes de existirem — quem precisa das vars (ex.: `shared/db`, instância
// Better Auth, nas tasks T8/T9) chama `getEnv()` no seu próprio boot.
// Reason: parse no top-level do módulo quebraria o build deste worker (sem
// as env vars no ambiente de CI/build), conforme aviso do orquestrador.
export function getEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuração de ambiente inválida — ${details}`);
  }
  return result.data;
}
