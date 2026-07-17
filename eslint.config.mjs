import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// Grafo de dependências entre módulos (AD-010, design.md Architecture Overview):
// shared é importável por todos; auth por categories/transactions/commitments/projections;
// categories por transactions/commitments; transactions e commitments por projections;
// projections é somente-leitura (não é importado por ninguém). Import externo a um
// elemento só é permitido via seu `index.ts` (regra de entry-point).
const moduleAllows = {
  auth: ["shared"],
  categories: ["shared", ["module", { elementName: "auth" }]],
  transactions: [
    "shared",
    ["module", { elementName: "auth" }],
    ["module", { elementName: "categories" }],
  ],
  commitments: [
    "shared",
    ["module", { elementName: "auth" }],
    ["module", { elementName: "categories" }],
  ],
  projections: [
    "shared",
    ["module", { elementName: "auth" }],
    ["module", { elementName: "categories" }],
    ["module", { elementName: "transactions" }],
    ["module", { elementName: "commitments" }],
  ],
};

const boundariesConfig = {
  files: ["**/*.{js,jsx,ts,tsx}"],
  plugins: { boundaries },
  settings: {
    "import/resolver": {
      typescript: { alwaysTryTypes: true },
    },
    // Restringe a análise de fronteiras a src/ — configs na raiz (eslint.config.mjs,
    // next.config.ts etc.) não fazem parte do grafo de módulos.
    "boundaries/include": ["src/**/*"],
    "boundaries/elements": [
      { type: "module", pattern: "modules/*", capture: ["elementName"] },
      { type: "shared", pattern: "shared" },
      { type: "app", pattern: "app" },
    ],
  },
  rules: {
    ...boundaries.configs.strict.rules,
    // Não restringimos quais pacotes externos cada elemento pode importar — fora do
    // escopo desta task (só o grafo entre módulos + entry-point via index.ts).
    "boundaries/external": 0,
    "boundaries/element-types": [
      2,
      {
        default: "disallow",
        rules: [
          ...Object.entries(moduleAllows).map(([elementName, allow]) => ({
            from: [["module", { elementName }]],
            allow,
          })),
          // app é a camada de composição: pode importar shared e qualquer módulo.
          { from: ["app"], allow: ["shared", "module"] },
        ],
      },
    ],
    "boundaries/entry-point": [
      2,
      {
        default: "disallow",
        rules: [
          { target: ["module"], allow: "index.ts" },
          { target: ["shared"], allow: "index.ts" },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  boundariesConfig,
  {
    // `src/instrumentation.ts` e `src/proxy.ts` são hooks de boot/roteamento
    // do Next.js (não fazem parte do grafo de módulos de negócio — `proxy.ts`
    // só importa `better-auth/cookies` e `next/server`, mesma exceção já
    // dada a configs de raiz). Sem esta exceção, o plugin de fronteiras marca
    // o arquivo (e seu teste) como "unknown file" (deny-by-default), já que
    // nenhum elemento em `boundaries/elements` o classifica.
    files: ["src/instrumentation.ts", "src/proxy.ts", "src/__tests__/**/*"],
    rules: {
      "boundaries/no-unknown-files": 0,
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Gerado pelo provider de cobertura do Vitest (T12: job `unit` do CI).
    "coverage/**",
  ]),
]);

export default eslintConfig;
