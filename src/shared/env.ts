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

// Decisão de design: "parse na inicialização" (design.md componente 3;
// spec.md AC-4 da story Persistência) é implementado como uma função
// exportada chamada pelo consumidor, não como parse no top-level do módulo.
// Assim, importar `shared` não valida env vars durante `next build`/`next
// dev` antes de existirem; quem precisa das vars no seu próprio boot (ex.:
// `shared/db`, instância Better Auth — tasks T8/T9) chama `getEnv()` lá.
// Isso continua cumprindo o AC (falha clara ao iniciar o subsistema que
// depende da env) sem acoplar a validação ao carregamento do módulo.
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
