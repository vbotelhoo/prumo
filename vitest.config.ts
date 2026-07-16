import { configDefaults, defineConfig } from "vitest/config";

// Vitest 4 substitui `vitest.workspace.ts` por `test.projects` inline
// (design.md, Research Notes). Convenção de nomes de arquivo (AD/design,
// componente 5): `*.test.ts` = unit; `*.integration.test.ts` = integração.
// Ambos co-localizados em `__tests__/` dentro do módulo/`shared` que testam.
export default defineConfig({
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
        },
      },
    ],
  },
});
