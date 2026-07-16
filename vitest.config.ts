import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

// Vitest 4 substitui `vitest.workspace.ts` por `test.projects` inline
// (design.md, Research Notes). Convenção de nomes de arquivo (AD/design,
// componente 5): `*.test.ts` = unit; `*.integration.test.ts` = integração.
// Ambos co-localizados em `__tests__/` dentro do módulo/`shared` que testam.
export default defineConfig({
  // Espelha o path alias `@/*` do tsconfig.json — sem isso, qualquer arquivo
  // testado que importe `@/...` (ex.: `src/modules/auth/domain/auth.ts`,
  // que importa `@/shared`) falha a resolver fora do build do Next.js
  // (Next resolve `@/*` no seu próprio bundler; Vitest não herda isso).
  // Descoberto na task T7 (auth): testes de integração são os primeiros a
  // exercitar um arquivo não-mockado que importa `@/shared` de dentro do
  // módulo `auth`.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Root-only option (não pode ser definida por project) — permite suíte
    // vazia enquanto T5/T6/T10 ainda não adicionaram testes reais.
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/__tests__/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "src/**/*.integration.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["./vitest.global-setup.ts"],
          // Parallelism Assessment (tasks.md, feature auth): integração NÃO
          // é parallel-safe — um único PostgreSQL compartilhado por suíte.
          // Descoberto na T7: com apenas `db.integration.test.ts` (T4) não
          // havia 2+ arquivos de integração rodando ao mesmo tempo; a partir
          // de 2 arquivos (`sign-up`/`sign-in-sign-out`), o paralelismo
          // padrão de arquivos do Vitest intercalava escritas/leituras (ex.:
          // `prisma.user.count()` de um arquivo via de outro), quebrando as
          // asserções de contagem/atomicidade. Arquivos de integração rodam
          // sequencialmente; dentro de um arquivo, os `it` já são
          // sequenciais por padrão do Vitest.
          fileParallelism: false,
        },
      },
    ],
  },
});
