# Setup Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/setup/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `PROJECT.md` (seção "Testes e qualidade"), `.specs/features/setup/spec.md` (story "Pirâmide de testes"), `.specs/features/setup/design.md` (componente 5). Repo greenfield — sem testes existentes para amostrar; comandos definidos pelo design.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/shared` lógica pura (money, env) | unit | Todas as branches; 1:1 com ACs da spec; todo edge case listado tem teste | `src/**/__tests__/*.test.ts` | `pnpm test:unit` |
| `src/shared/db` + schema migrado (camada `data/`) | integration | Conexão + existência das tabelas Better Auth pós-migration; erro orientativo sem Docker/URL | `src/**/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Rotas/páginas em `src/app` | e2e | Smoke: home 200 + contém "Prumo" (único fluxo de usuário do setup) | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Configs (eslint, vitest, playwright, CI, Railway), esqueletos de módulos, docs | none | — (build gate only) | — | `pnpm lint && pnpm typecheck && pnpm build` |

## Parallelism Assessment

> Generated from codebase — confirm before Execute. Sem testes existentes; classificação derivada do design.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Lógica pura, sem I/O nem estado compartilhado | Design: `shared/money` e `shared/env` sem deps de Next/Prisma |
| integration | No | Um PostgreSQL compartilhado por suíte (Testcontainers ou `DATABASE_URL`) | Design componente 5: globalSetup único por suíte |
| e2e | No | Uma app + um banco compartilhados via `webServer` do Playwright | Design componente 5 |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `pnpm test:unit` |
| Full | Tasks com testes de integração/E2E | `pnpm test:unit && pnpm test:integration && pnpm test:e2e` (suítes existentes até a task) |
| Build | Fim de fase e tasks config-only | `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` (+ integração/E2E quando existirem) |

---

## Execution Plan

### Phase 1: Fundação (Sequential)

```
T1 → T2 → T3
```

### Phase 2: Testes base + shared kernel + placeholder

```
T3 ──→ T4 ──┬→ T5 [P]
            ├→ T6 [P]
            └→ T7 [P]
```

### Phase 3: Persistência + Better Auth (Sequential)

```
T5, T6* → T8 → T9 → T10        (*T6 não bloqueia, mas a fase inicia após a Phase 2)
```

### Phase 4: E2E + CI + Deploy + Docs

```
T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14
```

> 4 fases → na fase Execute, apresentar a oferta de sub-agents (um worker por fase) antes de iniciar, conforme Critical Rules da skill.

---

## Task Breakdown

### T1: Scaffold Next.js 16 + pnpm + Node fixado

**What**: Projeto Next.js 16 (App Router, TS strict, Tailwind, ESLint flat config) criado com `create-next-app` e pnpm; versão Node LTS verificada contra o runtime do Railway e fixada.
**Where**: raiz (`package.json`, `tsconfig.json`, `next.config.ts`, `.nvmrc`, `eslint.config.mjs` base)
**Depends on**: None
**Reuses**: `create-next-app` (design, Code Reuse)
**Requirement**: SETUP-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `pnpm dev` serve a app sem erros; `pnpm build` conclui
- [x] TS `strict: true`; App Router; Tailwind ativo
- [x] Node LTS fixado em `.nvmrc` + `engines` (Node 24.x Active LTS; validação contra o runtime do Railway fica para a Fase 4/T13, conforme instrução do orquestrador)
- [x] Scripts base: `dev`, `build`, `start`, `lint`, `typecheck`

**Tests**: none · **Gate**: build (`pnpm lint && pnpm typecheck && pnpm build`) — ✅ passou
**Commit**: `chore(setup): scaffold next.js 16 com pnpm e node fixado`

---

### T2: Estrutura de módulos + READMEs de módulo

**What**: Diretórios `src/modules/{auth,categories,transactions,commitments,projections}` (cada um com `domain/ data/ services/ actions/ components/ __tests__/ index.ts README.md`), `src/shared/` (+ `index.ts`, `README.md`) e `e2e/`.
**Where**: `src/modules/*`, `src/shared/`, `e2e/`
**Depends on**: T1
**Reuses**: estrutura do PROJECT.md (seção Estrutura de pastas)
**Requirement**: SETUP-01, SETUP-13 (READMEs de módulo)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Todos os diretórios existem (`.gitkeep` nos vazios); `index.ts` de cada módulo com comentário do contrato
- [x] README de cada módulo declara responsabilidade, API pública e dependências (grafo AD-010)
- [x] Build gate passa

**Tests**: none · **Gate**: build — ✅ passou
**Commit**: `chore(setup): estrutura de módulos do monolito modular`

---

### T3: Lint de fronteiras de módulos

**What**: `eslint-plugin-boundaries@^5` (preset `strict`) configurado no flat config com elements (`module`, `shared`, `app`) e policies espelhando o grafo AD-010 + entry-point via `index.ts`; policy explícita `app → module` via `index.ts`.
**Where**: `eslint.config.mjs`
**Depends on**: T2
**Reuses**: `boundaries.configs.strict`; grafo do design (Architecture Overview)
**Requirement**: SETUP-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Import interno de outro módulo (fora do `index.ts`) → `pnpm lint` falha (demonstrado com arquivo temporário, depois removido)
- [x] Import violando o grafo (ex.: `categories` → `transactions`) → `pnpm lint` falha (idem)
- [x] Arquivo fora dos elementos declarados → erro (deny-by-default do preset strict)
- [x] Código atual passa `pnpm lint` limpo

**Tests**: none · **Gate**: build — ✅ passou
**Commit**: `feat(setup): lint de fronteiras de módulos (eslint-plugin-boundaries)`

---

### T4: Vitest configurado (projects unit + integration)

**What**: `vitest.config.ts` com `test.projects` (`unit`: `src/**/__tests__/**/*.test.ts` excluindo integração; `integration`: `src/**/*.integration.test.ts`, globalSetup placeholder) + scripts `test:unit` / `test:integration`.
**Where**: `vitest.config.ts`, `package.json`
**Depends on**: T3
**Reuses**: padrão `test.projects` do Vitest 4 (design, Research Notes)
**Requirement**: SETUP-08 (infra)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `pnpm test:unit` executa (verde com suíte vazia ou sanity test)
- [x] Projects filtráveis por `--project`; convenção de nomes documentada no config
- [x] Build gate passa

**Tests**: none (infra de teste) · **Gate**: build
**Commit**: `chore(setup): vitest 4 com projects unit e integration`

---

### T5: Validação de env em shared [P]

**What**: `src/shared/env.ts` — schema Zod (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), parse na inicialização com erro claro listando vars faltantes; exposto via `src/shared/index.ts`.
**Where**: `src/shared/env.ts`, `src/shared/__tests__/env.test.ts`
**Depends on**: T4
**Reuses**: Zod (AD-003)
**Requirement**: SETUP-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Env completa → parse ok; env faltante → erro nomeando as vars ausentes (AC-4 da story Persistência)
- [x] Unit tests cobrem: sucesso, cada var ausente, mensagem de erro
- [x] Quick gate passa; test count registrado

**Tests**: unit · **Gate**: quick
**Commit**: `feat(shared): validação de env vars com zod`

---

### T6: Tipo Money em shared [P]

**What**: `src/shared/money/` — branded type `Money` (centavos inteiros), `money()` construtor, `moneySchema`, `addMoney`/`subtractMoney`, `formatBRL` via `Intl.NumberFormat` pt-BR; exposto via `src/shared/index.ts`.
**Where**: `src/shared/money/`, `src/shared/__tests__/money.test.ts`
**Depends on**: T4
**Reuses**: `Intl.NumberFormat` nativo; Zod
**Requirement**: SETUP-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] 123456 centavos → "R$ 1.234,56" (AC-1); aritmética inteira exata (AC-2)
- [x] Não-inteiro/NaN/Infinity rejeitados, nunca truncados (AC-3)
- [x] Zero deps de Next/React/Prisma no diretório
- [x] Unit tests 1:1 com os 3 ACs + edge cases (zero, negativo, valores grandes); quick gate passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(shared): tipo money em centavos com formatação brl`

---

### T7: Página placeholder com identidade [P]

**What**: `src/app/page.tsx` estática (sem acesso a banco) com nome "Prumo", tagline e significado do nome, usando shadcn/ui (`shadcn init` + componentes usados) e Tailwind.
**Where**: `src/app/page.tsx`, `src/app/layout.tsx`, `components.json`, `src/shared/components/ui/*`
**Depends on**: T4
**Reuses**: shadcn/ui CLI; identidade do PROJECT.md
**Requirement**: SETUP-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Home renderiza nome, tagline "Sua vida financeira alinhada." e significado
- [x] Página 100% estática (nenhum import de db/auth) — garante edge case "banco fora do ar"
- [x] Build gate passa

**Tests**: none — e2e smoke coberto em T11 (**merge forward**: a infraestrutura Playwright nasce lá; regra de resolução de dependência de compilação do tasks.md)
**Gate**: build
**Commit**: `feat(app): página placeholder com identidade do prumo`

---

### T8: Prisma + client singleton em shared

**What**: Prisma instalado; `prisma/schema.prisma` (datasource PostgreSQL via `DATABASE_URL`, generator com output padrão — exigência do Better Auth CLI); singleton `src/shared/db.ts` (padrão global p/ hot-reload) exposto via `src/shared/index.ts`; `prisma generate` no `postinstall`.
**Where**: `prisma/schema.prisma`, `src/shared/db.ts`, `package.json`
**Depends on**: T5
**Reuses**: `shared/env.ts` (T5) para `DATABASE_URL`
**Requirement**: SETUP-04 (parcial)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `pnpm prisma generate` funciona; client importável de `src/shared`
- [x] Output padrão do generator (risco flagado no design mitigado)
- [x] Build gate passa

**Tests**: none — integração coberta em T10 (**merge forward**: Testcontainers nasce lá)
**Gate**: build
**Commit**: `feat(shared): prisma client singleton`

---

### T9: Better Auth configurado (instância + schema + handler)

**What**: `better-auth` instalado; instância em `src/modules/auth/domain/auth.ts` (`prismaAdapter` + `emailAndPassword: { enabled: true }`, named export) exposta via `index.ts` do módulo; models gerados com `@better-auth/cli generate` + migration criada; rota `src/app/api/auth/[...all]/route.ts` com `toNextJsHandler(auth)`.
**Where**: `src/modules/auth/`, `prisma/schema.prisma` (models), `prisma/migrations/*`, `src/app/api/auth/[...all]/route.ts`
**Depends on**: T8
**Reuses**: `@better-auth/cli generate`; `shared/db` (T8)
**Requirement**: SETUP-04, SETUP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `pnpm prisma migrate dev` contra Postgres vazio cria as tabelas Better Auth (AC-1)
- [x] Com a app rodando, endpoint GET embutido do handler (ex.: `/api/auth/ok`) responde sucesso (AC-2; ver nota do design se `/ok` não existir na versão)
- [x] Instância com adapter Prisma + e-mail/senha, exposta só via `index.ts` (AC-3); `pnpm lint` (fronteiras) limpo
- [x] Build gate passa

**Tests**: none — verificação automatizada em T10 (integração: tabelas) e T11 (pipeline completo); AC-2 verificado manualmente nesta task e de forma automatizada pelo smoke do CI
**Gate**: build
**Commit**: `feat(auth): better auth com prisma adapter e handler de rota`

---

### T10: Suíte de integração com Testcontainers + fallback DATABASE_URL

**What**: globalSetup do project `integration`: usa `DATABASE_URL` de teste se definida (CI); senão sobe `@testcontainers/postgresql`, roda `prisma migrate deploy`, derruba no teardown; sem Docker e sem URL → erro orientativo. Primeiro teste de integração: conexão via `shared/db` + tabelas Better Auth existem.
**Where**: `vitest.config.ts` (globalSetup), `src/shared/__tests__/db.integration.test.ts` (ou setup dedicado)
**Depends on**: T9
**Reuses**: `@testcontainers/postgresql`; migrations de T9
**Requirement**: SETUP-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `pnpm test:integration` local (Docker) verde: sobe container, migra, testa, derruba (AC-2 da story Testes)
- [x] Com `DATABASE_URL` de teste definida, usa-a em vez de Testcontainers (AC-3)
- [x] Sem Docker e sem URL → mensagem clara com as duas opções (edge case)
- [x] Teste valida conexão + existência das tabelas `user`/`session`/`account`/`verification`

**Tests**: integration · **Gate**: full (unit + integration)
**Commit**: `feat(setup): suíte de integração com testcontainers e fallback de url`

---

### T11: Playwright + smoke E2E da home

**What**: `playwright.config.ts` com `webServer` (build+start de produção contra Postgres de teste) e smoke test: home responde 200 e contém "Prumo". Script `test:e2e`.
**Where**: `playwright.config.ts`, `e2e/home.spec.ts`, `package.json`
**Depends on**: T10
**Reuses**: `webServer` do Playwright; placeholder de T7 (cobre o e2e de T7 — merge forward)
**Requirement**: SETUP-10 (+ cobertura e2e de SETUP-03)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `pnpm test:e2e` roda contra build de produção e passa (AC-4 da story Testes)
- [x] Smoke: `GET /` → 200 + texto "Prumo"
- [x] Full gate passa (unit + integration + e2e)

**Tests**: e2e · **Gate**: full
**Commit**: `feat(setup): playwright com smoke e2e da home`

---

### T12: Workflow de CI

**What**: `.github/workflows/ci.yml` — jobs: `lint-typecheck`, `unit` (cobertura), `integration` (service container postgres + `migrate deploy` + `DATABASE_URL`), `e2e` (service container + upload de relatório em falha), `build`. Node da `.nvmrc` + cache pnpm.
**Where**: `.github/workflows/ci.yml`
**Depends on**: T11
**Reuses**: scripts pnpm das tasks anteriores; fallback `DATABASE_URL` de T10
**Requirement**: SETUP-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] Workflow dispara em push/PR para `main` com os 5 jobs (AC-1) — verificado no `ci.yml`: `on.push`/`on.pull_request` restritos a `main`; jobs `lint-typecheck`, `unit`, `integration`, `e2e`, `build` presentes
- [x] Falha em qualquer etapa falha o workflow (AC-2); artifact Playwright em falha de E2E (AC-3) — comportamento padrão do GitHub Actions (qualquer step com exit != 0 falha o job/workflow) + `actions/upload-artifact` com `if: failure()` no job `e2e`
- [ ] Push real → workflow completo verde no GitHub (AC-4) — **pendência do usuário**: não há credencial válida de push para o remoto neste ambiente (`gh auth status` inválido); todos os comandos de cada job foram validados localmente com as mesmas env vars (ver resumo da Fase 4), mas o disparo real no GitHub não pôde ser executado por este agente

**Tests**: none (config; a verificação é o workflow verde real) · **Gate**: build + workflow verde no GitHub (verificação real do workflow verde é pendência do usuário — ver nota acima)
**Commit**: `ci(setup): workflow com lint, typecheck, unit, integração, e2e e build`

---

### T13: Deploy no Railway

**What**: Config de deploy (`railway.json` ou painel documentado): build `pnpm install --frozen-lockfile && pnpm build`; start `pnpm start:prod` = `prisma migrate deploy && next start`; envs (`DATABASE_URL` do Postgres gerenciado, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`). Deploy real executado.
**Where**: `railway.json`, `package.json` (script `start:prod`), README (passos manuais)
**Depends on**: T12
**Reuses**: migrations (T9), placeholder (T7)
**Requirement**: SETUP-12

**Tools**: MCP: NONE · Skill: NONE
**⚠️ Envolvimento do usuário**: criação do projeto/serviço no Railway e conexão do repositório são passos manuais na conta do usuário — a task orienta e valida, o usuário executa o que exigir credenciais.

**Done when**:

- [ ] Build no Railway conclui (AC-1); `migrate deploy` roda antes de servir e aborta em falha (AC-2, edge case)
- [ ] URL pública responde 200 com o placeholder (AC-3)
- [ ] Passos manuais documentados no README

**Tests**: none (verificação = URL pública no ar) · **Gate**: build + verificação manual da URL
**Commit**: `chore(setup): configuração de deploy no railway`

---

### T14: Documentação do projeto

**What**: `README.md` (descrição oficial, tagline, significado, problema, como rodar, como executar cada suíte, badge de CI, passos manuais Railway + branch protection recomendada), `docs/ARCHITECTURE.md` (monolito modular, grafo mermaid, 7 regras de fronteira), `docs/TESTING.md` (estratégia, execução local/CI, convenções incl. independência entre testes).
**Where**: `README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`
**Depends on**: T13
**Reuses**: PROJECT.md (conteúdo-fonte); grafo do design
**Requirement**: SETUP-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] README com todos os itens do AC-1 (incl. badge de CI funcional)
- [ ] ARCHITECTURE.md com AC-2; TESTING.md com AC-3 (READMEs de módulo já entregues em T2 — AC-4)
- [ ] Build gate passa

**Tests**: none · **Gate**: build
**Commit**: `docs(setup): readme, arquitetura e estratégia de testes`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (após T3):
  T4, então:
    ├── T5 [P]
    ├── T6 [P]   } unit tests parallel-safe; sem estado compartilhado
    └── T7 [P]

Phase 3 (Sequential — integração não é parallel-safe):
  T5 completo, então: T8 ──→ T9 ──→ T10

Phase 4 (Sequential — e2e/CI/deploy encadeados):
  T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14
```

**Parallelism constraint:** T5/T6/T7 são `[P]`: sem dependência entre si, testes unit (parallel-safe) ou build-only. Phases 3 e 4 são sequenciais: integração e E2E compartilham banco/app (Parallelism Assessment: No).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Scaffold | 1 comando gerador + pins de versão | ✅ Granular |
| T2: Estrutura de módulos | criação de diretórios/arquivos-esqueleto (1 conceito) | ✅ Granular |
| T3: Lint de fronteiras | 1 arquivo de config | ✅ Granular |
| T4: Vitest | 1 arquivo de config + scripts | ✅ Granular |
| T5: Env | 1 arquivo + testes co-locados | ✅ Granular |
| T6: Money | 1 diretório coeso + testes co-locados | ✅ Granular |
| T7: Placeholder | 1 página + init shadcn (coeso) | ✅ Granular |
| T8: Prisma | schema + 1 singleton (coeso) | ✅ Granular |
| T9: Better Auth | instância + schema gerado + 1 rota (coeso: 1 integração) | ✅ Granular (aceitável — passos indissociáveis da mesma lib) |
| T10: Integração | 1 globalSetup + 1 teste | ✅ Granular |
| T11: Playwright | 1 config + 1 spec | ✅ Granular |
| T12: CI | 1 workflow | ✅ Granular |
| T13: Railway | 1 config + 1 script + deploy | ✅ Granular |
| T14: Docs | 3 documentos de conteúdo-fonte único | ✅ Granular (coeso) |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início Phase 1 | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T3 | T3→T4 | ✅ Match |
| T5 | T4 | T4→T5 [P] | ✅ Match |
| T6 | T4 | T4→T6 [P] | ✅ Match |
| T7 | T4 | T4→T7 [P] | ✅ Match |
| T8 | T5 | T5→T8 (Phase 3 após Phase 2) | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |
| T11 | T10 | T10→T11 | ✅ Match |
| T12 | T11 | T11→T12 | ✅ Match |
| T13 | T12 | T12→T13 | ✅ Match |
| T14 | T13 | T13→T14 | ✅ Match |

T5/T6/T7 são `[P]` e não dependem entre si. ✅

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | config/scaffold | none | none | ✅ OK |
| T2 | esqueletos + docs | none | none | ✅ OK |
| T3 | config eslint | none | none | ✅ OK |
| T4 | config vitest | none | none | ✅ OK |
| T5 | shared lógica pura (env) | unit | unit | ✅ OK |
| T6 | shared lógica pura (money) | unit | unit | ✅ OK |
| T7 | rota em `src/app` | e2e | none (merge forward → T11) | ✅ OK (regra de compilation dependency: infra Playwright nasce em T11, que inclui o e2e da home) |
| T8 | `shared/db` (data) | integration | none (merge forward → T10) | ✅ OK (Testcontainers nasce em T10, que testa conexão via `shared/db`) |
| T9 | schema/migration + rota handler | integration/e2e | none (merge forward → T10/T11 + verificação manual do AC-2) | ✅ OK (T10 valida tabelas; pipeline completo em T11/CI) |
| T10 | globalSetup + teste data | integration | integration | ✅ OK |
| T11 | config playwright + spec | e2e | e2e | ✅ OK |
| T12 | config CI | none | none | ✅ OK |
| T13 | config deploy | none | none | ✅ OK |
| T14 | docs | none | none | ✅ OK |
