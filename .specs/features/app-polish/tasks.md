# app-polish — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

**4 fases ⇒ na entrada do Execute, apresentar a oferta de um sub-agente por fase antes de qualquer task.**

**Ambiente**: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` antes de qualquer gate (Vitest 4 exige Node 22.13+). Integração/e2e: `docker start prumo-test-pg` (porta 55432). Matar `next start` manual por PID (`ss -ltnp | grep 3000`).

---

**Design**: `.specs/features/app-polish/design.md` (Approved)
**Status**: Approved (2026-07-24) — Execute em andamento

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `docs/TESTING.md` (pirâmide AD-011, nomenclatura, independência entre testes), `.github/workflows/ci.yml`, `vitest` projects `unit`/`integration` em `package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Primitivos UI com lógica de apresentação (`EmptyState`, `StatCard`, `PageHeader`, `QuickActions`, `error.tsx`, `DashboardHero`) | unit (RTL + jsdom — **infra nova em T1**) | Render + todos os branches de props (tone, action opcional, `reset()` no clique, negativo/positivo, um modal por vez) 1:1 com os ACs | `src/**/__tests__/*.test.tsx` | `pnpm test:unit` |
| Tokens de tema (`globals.css`) | unit | Pares texto/fundo novos AA nos 2 temas; presença dos 8 `--chart-N` nos 2 temas | `src/app/__tests__/theme-contrast.test.ts` | `pnpm test:unit` |
| Composição de página / fluxos de usuário (dashboard, 4 páginas, estados vazios, responsivo) | e2e | Toda rota em escopo: happy + edge cases listados na spec + estado vazio; seletores atualizados no MESMO commit de qualquer mudança de copy | `e2e/*.spec.ts` | `pnpm test:e2e` |
| `loading.tsx` (presentational puro, sem lógica) | none | — (build gate; loading transitório não é assertável de forma estável em e2e) | — | `pnpm build` |
| `domain/`, `services/`, `data/`, `actions/` | inalterados | Baselines mantidas: **222 unit / 156 integration / 57 e2e** (regressão) | existentes | `pnpm test:unit` / `test:integration` / `test:e2e` |

**Nota (infra)**: o repositório não tem testes de componente React (só lógica pura + e2e). Os primitivos novos concentram branches de apresentação que os ACs exigem; T1 adiciona `@testing-library/react` + ambiente `jsdom` ao project `unit` do Vitest — decisão de infra sujeita à aprovação destas tasks.

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Puro/jsdom, sem I/O nem estado compartilhado | `docs/TESTING.md` §1; suíte atual roda sem serviços |
| integration | No | Banco PostgreSQL único compartilhado por execução | `docs/TESTING.md` §"Independência entre testes" |
| e2e | No | Um app + um banco por execução (Playwright `webServer`) | `docs/TESTING.md` §"Independência entre testes" |

## Gate Check Commands

> Generated from codebase — confirm before Execute. Prefixo obrigatório: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unit | `pnpm typecheck && pnpm lint && pnpm test:unit` |
| Full | Tasks com e2e (e regressão de integração) | quick + `pnpm test:integration && pnpm test:e2e` |
| Build | Fechamento de fase / tasks presentational-only | full + `pnpm build` |

---

## Execution Plan

### Fase 1 — Fundação (T1 → T2 → T3, depois T4/T5/T6 order-free)

```
T1 ──→ T2 ──→ T3
        │
        ├──→ T4 [P]
T1 ─────┼──→ T5 [P]
        └──→ T6 [P]
```

### Fase 2 — Dashboard (T7/T8 order-free → T9)

```
T1 ──→ ├── T7 [P] ─┐
       └── T8 [P] ─┼──→ T9   (T9 também depende de T3, T4)
```

### Fase 3 — Páginas (sequencial — e2e não é parallel-safe)

```
T10 ──→ T11 ──→ T12 ──→ T13   (todas dependem de T2, T3)
```

### Fase 4 — Qualidade transversal (sequencial)

```
T14 ──→ T15 ──→ T16   (dependem de T9..T13)
```

---

## Task Breakdown

### T1: Infra de teste de componente (RTL + jsdom)

**What**: Adicionar `@testing-library/react` + `jsdom` ao project `unit` do Vitest para arquivos `*.test.tsx`, com um smoke test provando render+interação.
**Where**: `vitest.config.ts`, `package.json` (devDeps), `src/shared/__tests__/rtl-smoke.test.tsx`
**Depends on**: None
**Reuses**: Projects `unit`/`integration` existentes do Vitest
**Requirement**: Infra para POLISH-02/03/05/06/07 (testes de componente exigidos pela matriz)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [x] `*.test.tsx` roda no project `unit` com ambiente jsdom; `*.test.ts` continua em node
- [x] Smoke test: render + click funciona
- [x] Gate quick passa; test count: 222 + smoke (baseline mantida, nada deletado)

**Tests**: unit · **Gate**: quick
**Commit**: `test(infra): add React Testing Library + jsdom to unit project`

---

### T2: Primitivos EmptyState + Skeleton

**What**: `EmptyState` (`{icon?, title, description?, action?}`) e `Skeleton` (`{className?}`, padrão shadcn) em `shared`, exportados pela API pública, com testes RTL.
**Where**: `src/shared/components/ui/empty-state.tsx`, `src/shared/components/ui/skeleton.tsx`, `src/shared/index.ts`, `src/shared/__tests__/empty-state.test.tsx`
**Depends on**: T1
**Reuses**: Idiom de `src/shared/components/ui/*` (shadcn vendored, AD-004); lucide-react
**Requirement**: POLISH-03, POLISH-04 (parcial)

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor antes de editar UI)

**Done when**:

- [x] EmptyState: branches com/sem description/action/icon testados; só tokens
- [x] Exports públicos disponíveis; gate quick passa (baseline + novos)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(shared): add EmptyState and Skeleton primitives`

---

### T3: Primitivos StatCard + PageHeader

**What**: `StatCard` (`{label, value: Money, tone?: "neutral"|"entrada"|"saida"}`, formatBRL + tabular-nums) e `PageHeader` (`{title, description?, action?}`) em `shared`, com testes RTL cobrindo os 3 tones.
**Where**: `src/shared/components/ui/stat-card.tsx`, `src/shared/components/ui/page-header.tsx`, `src/shared/index.ts`, `src/shared/__tests__/stat-card.test.tsx`
**Depends on**: T1, T2 (sequência em `shared/index.ts`)
**Reuses**: `Card`, `formatBRL`/`money` (AD-008)
**Requirement**: POLISH-11, POLISH-12, POLISH-13

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] 3 tones testados (neutral/entrada/saida → tokens semânticos corretos); `tabular-nums` presente
- [x] Gate quick passa (baseline + novos)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(shared): add StatCard and PageHeader primitives`

---

### T4: Tokens `--chart-1..8` + refactor do gráfico [P]

**What**: Definir `--chart-1..8` em `:root` e `.dark` de `globals.css` (paleta clara já validada; variantes escuras calibradas via dataviz) e refatorar `CategorySpendingChart` para `var(--chart-N)`, vazio via `EmptyState`, textos de tooltip/legenda via tokens. Teste de presença dos 8 tokens nos 2 temas.
**Where**: `src/app/globals.css`, `src/app/app/_components/CategorySpendingChart.tsx`, `src/app/__tests__/theme-contrast.test.ts`
**Depends on**: T2
**Reuses**: Paleta CVD-safe existente do componente; padrão do `theme-contrast.test.ts`
**Requirement**: POLISH-09 (parcial), POLISH-04 · AD-018

**Tools**: MCP: NONE · Skill: `dataviz` (variantes escuras) + `impeccable` (craft-floor)

**Done when**:

- [x] Zero hex no componente; 8 tokens presentes nos 2 temas (teste)
- [x] Gate quick passa (baseline + novos)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(design): chart color tokens (AD-018) and chart refactor`

---

### T5: `error.tsx` compartilhado [P]

**What**: Boundary client em `/app` com mensagem pt-BR calma + "Tentar novamente" → `reset()`, com teste RTL (mensagem renderiza; clique chama `reset`).
**Where**: `src/app/app/error.tsx`, `src/app/__tests__/app-error.test.tsx`
**Depends on**: T1
**Reuses**: `Button`, tokens; copy no tom do DESIGN.md
**Requirement**: POLISH-02

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] Sem stack trace/jargão; `reset` invocado no clique (asserted)
- [x] Gate quick passa (baseline + novos)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(app): shared error boundary for /app routes`

---

### T6: `loading.tsx` ×5 com skeletons [P]

**What**: Um `loading.tsx` por rota (`/app`, transactions, commitments, categories, projections), cada um espelhando a forma real da página (herói+grid no dashboard; header+linhas nas listas) para evitar layout shift.
**Where**: `src/app/app/{,transactions/,commitments/,categories/,projections/}loading.tsx`
**Depends on**: T2
**Reuses**: `Skeleton` (T2)
**Requirement**: POLISH-01

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] 5 arquivos presentes, só tokens, formas aproximam as páginas
- [x] `pnpm typecheck && pnpm lint && pnpm build` passam

**Tests**: none (matriz: presentational puro) · **Gate**: build
**Commit**: `feat(app): route-level loading skeletons`

---

### T7: DashboardHero [P]

**What**: Componente server-renderável do herói (`{userName, month, saldoProjetado}`): saldo Display tabular protagonista, saudação secundária, cor semântica no negativo — com testes RTL (positivo neutro/negativo Saída, tabular).
**Where**: `src/app/app/_components/DashboardHero.tsx`, `src/app/app/__tests__/dashboard-hero.test.tsx`
**Depends on**: T1
**Reuses**: `formatBRL`/`money` (AD-008); tipografia Display do DESIGN.md
**Requirement**: POLISH-05, POLISH-06

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] Branches negativo/positivo testados; um único Display
- [x] Gate quick passa (baseline + novos)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(dashboard): hero balance component`

---

### T8: Exports dos modais + QuickActions [P]

**What**: Exportar `TransactionModal`/`CommitmentModal` nos `index.ts` dos módulos donos e criar `QuickActions` client (`{categories}`): 2 botões + os 2 modais (estado `openModal` único — um por vez), `router.refresh()` no sucesso. Teste RTL com modais mockados (`vi.mock` dos módulos): cada botão abre o modal certo, nunca os dois.
**Where**: `src/modules/transactions/index.ts`, `src/modules/commitments/index.ts`, `src/app/app/_components/QuickActions.tsx`, `src/app/app/__tests__/quick-actions.test.tsx`
**Depends on**: T1
**Reuses**: Contratos dos modais (design §Code Reuse); `Button`
**Requirement**: POLISH-07 (parcial), POLISH-08 (parcial — fluxo real no e2e do T9)

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] Exports públicos compilam; lint de fronteiras verde (AD-010)
- [x] RTL: um modal por vez; gate quick passa (baseline + novos)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(dashboard): quick create actions with composed module modals`

---

### T9: Recomposição do dashboard + e2e

**What**: Reescrever `src/app/app/page.tsx`: fetch adiciona `listCategoriesByUser`; layout = `DashboardHero` + `QuickActions` + 3 `StatCard` (entradas/saídas/comprometido — comprometido em tone `saida`, sem azul) + cards gráfico/vencimentos; remover os 4 botões emoji e a navegação redundante. Atualizar/expandir `e2e/dashboard.spec.ts`: herói proeminente e correto, fluxo atalho (criar transação pelo dashboard → números atualizam), estado zerado (R$ 0,00 + empty states), botões antigos ausentes, seletores escopados por `getByRole("dialog")`.
**Where**: `src/app/app/page.tsx`, `src/app/app/_components/UpcomingInstallmentsList.tsx` (tokenizar), `e2e/dashboard.spec.ts`
**Depends on**: T3, T4, T7, T8
**Reuses**: `mergeCategorySpending`, queries AD-016 existentes
**Requirement**: POLISH-05..10 (fecha a story do dashboard)

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] ACs 1–6 da story do dashboard verificados por e2e
- [x] Gate full passa: unit ≥ baseline+novos, integration 156, e2e ≥ 57 (ajustados+novos, nada deletado sem substituto)

**Tests**: e2e · **Gate**: full
**Commit**: `feat(dashboard): hero-first recomposition with quick actions`

---

### T10: Polish de Transações

**What**: `PageHeader`; `TransactionList` com colunas alinhadas (valores tabulares à direita, semântica só no valor); `Pagination` e `TransactionModal`/`DeleteTransactionDialog` no DS; `EmptyState` compartilhado (remove `TransactionsEmptyState` local); resolver prop `total` (usar ou remover). Seletores de `e2e/transactions.spec.ts` atualizados no mesmo commit de qualquer copy alterada; e2e ganha assert do empty state padrão se ausente.
**Where**: `src/modules/transactions/components/*`, `src/app/app/transactions/page.tsx`, `e2e/transactions.spec.ts`
**Depends on**: T2, T3
**Reuses**: Primitivos T2/T3; suíte e2e existente como gate de regressão
**Requirement**: POLISH-11, POLISH-12, POLISH-13, POLISH-16, POLISH-04 (parcial)

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] Zero paleta hardcoded no módulo; colunas alinhadas nos 2 temas
- [x] Gate full passa (baselines mantidas; seletores sincronizados)

**Tests**: e2e · **Gate**: full
**Commit**: `feat(transactions): align page with design system`

---

### T11: Polish de Compromissos

**What**: `PageHeader`; `CommitmentList` com progresso de quitação via `Progress` (pagas/total legível de relance); estados de parcela (prevista/paga) dentro das regras semânticas; `EmptyState` compartilhado; modais/diálogos no DS; normalizar copy ("Novo compromisso") atualizando helpers de `e2e/commitments.spec.ts` E `e2e/dashboard.spec.ts` no mesmo commit.
**Where**: `src/modules/commitments/components/*`, `src/app/app/commitments/page.tsx`, `e2e/commitments.spec.ts`, `e2e/dashboard.spec.ts` (helpers)
**Depends on**: T2, T3
**Reuses**: `Progress` de `shared/ui`; primitivos T2/T3
**Requirement**: POLISH-14, POLISH-16, POLISH-11..13 (aplicados à página)

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] Progresso de quitação assertado em e2e; copy e seletores sincronizados
- [x] Gate full passa (baselines mantidas)

**Tests**: e2e · **Gate**: full
**Commit**: `feat(commitments): align page with design system`

---

### T12: Polish de Categorias + e2e novo

**What**: `PageHeader`; `CategoriesPageClient`/`CategorySection`/`CreateCategoryForm`/`DeleteCategoryDialog` tokenizados e alinhados; `EmptyState` onde aplicável. Criar `e2e/categories.spec.ts` (a página não tem spec próprio): criar categoria personalizada → aparece na seção; excluir → some; estados vazios padrão.
**Where**: `src/modules/categories/components/*`, `src/app/app/categories/page.tsx`, `e2e/categories.spec.ts` (novo)
**Depends on**: T2, T3
**Reuses**: Primitivos T2/T3; padrões de auth/fixture dos specs existentes
**Requirement**: POLISH-11..13, POLISH-16, POLISH-03 (aplicados à página)

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] Spec novo verde (happy + exclusão + vazio); zero paleta hardcoded no módulo
- [x] Gate full passa

**Tests**: e2e · **Gate**: full
**Commit**: `feat(categories): align page with design system and add e2e coverage`

---

### T13: Polish de Projeções

**What**: `ProjectionSummary` refatorada sobre `StatCard` (contrato `{projection}` mantido — dashboard e projeções seguem funcionando); `MonthNavigator` e `PageHeader` no DS; comprometido em tone `saida` (remove azul). Seletores de `e2e/projections.spec.ts` sincronizados (lição do timeout: seletor, não infra).
**Where**: `src/modules/projections/components/*`, `src/app/app/projections/page.tsx`, `e2e/projections.spec.ts`
**Depends on**: T3
**Reuses**: `StatCard` (T3)
**Requirement**: POLISH-15, POLISH-11..13 (aplicados à página)

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor)

**Done when**:

- [x] 4 stats via StatCard nos 2 temas; e2e de projections verde
- [x] Gate full passa

**Tests**: e2e · **Gate**: full
**Commit**: `feat(projections): align page with design system`

---

### T14: E2E responsivo + teclado

**What**: Novo `e2e/responsive.spec.ts`: nas 5 páginas, viewport 320px → sem scroll horizontal do body (`document.documentElement.scrollWidth <= innerWidth`); alvos de toque dos controles primários ≥44px; navegação por teclado dos fluxos-chave (atalho do dashboard, paginação, navegador de mês) com foco visível. Corrigir o que falhar.
**Where**: `e2e/responsive.spec.ts` (novo), fixes pontuais nas páginas
**Depends on**: T9, T10, T11, T12, T13
**Reuses**: Padrão de viewport do `shell.spec.ts`
**Requirement**: POLISH-17, POLISH-18, POLISH-20

**Tools**: MCP: NONE · Skill: `impeccable` (craft-floor; `adapt` como referência se necessário)

**Done when**:

- [ ] 5 páginas × 320px sem overflow; asserts de toque/teclado verdes
- [ ] Gate full passa

**Tests**: e2e · **Gate**: full
**Commit**: `test(e2e): responsive and keyboard coverage for app pages`

---

### T15: Varredura final de tokens + contraste

**What**: Grep gate: zero classes de paleta hardcoded (`text-gray-*`, `bg-zinc-*`, `text-red-*`, `text-green-*`, `text-blue-*`, hex) em `src/app/app` + `src/modules/*/components`; corrigir sobras; adicionar ao `theme-contrast.test.ts` todo par texto/fundo novo introduzido pela feature.
**Where**: Sobras apontadas pelo grep; `src/app/__tests__/theme-contrast.test.ts`
**Depends on**: T9, T10, T11, T12, T13
**Reuses**: Padrão do teste de contraste (app-shell)
**Requirement**: POLISH-04, POLISH-19

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Grep retorna vazio (comando registrado no commit); pares novos AA nos 2 temas
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(app): eliminate remaining hardcoded palette classes`

---

### T16: Passes critique/polish/harden + detector

**What**: Rodar os passes `critique` → `polish` → `harden` do impeccable sobre cada uma das 5 páginas (browser/screenshots nos 2 temas, 320px e 1280px), corrigir ou justificar cada achado, e fechar com o detector mecânico zero findings nos alvos alterados. Registrar o resultado dos passes na pasta da feature.
**Where**: Ajustes finais nas páginas; `node ~/.agents/skills/impeccable/scripts/detect.mjs --json <alvos>`; `.specs/features/app-polish/` (registro)
**Depends on**: T14, T15
**Reuses**: DESIGN.md como rubrica; screenshots Playwright (padrão da auditoria dark do app-shell)
**Requirement**: POLISH-21, POLISH-22

**Tools**: MCP: NONE · Skill: `impeccable` (`critique`, `polish`, `harden`)

**Done when**:

- [ ] Detector: zero findings; nenhum achado dos passes ignorado sem justificativa registrada
- [ ] Gate build passa (typecheck, lint, unit, integration, e2e, build — números finais registrados)

**Tests**: none novos (gate completo) · **Gate**: build
**Commit**: `polish(app): impeccable critique/polish/harden passes (item 9 complete)`

---

## Parallel Execution Map

```
Fase 1: T1 ──→ T2 ──→ T3
                │
                ├──→ T4 [P] ┐
        T1 ─────┼──→ T5 [P] ├─ order-free (unit é parallel-safe; arquivos disjuntos)
                └──→ T6 [P] ┘

Fase 2: T1 ──→ ├── T7 [P] ─┐
               └── T8 [P] ─┴──→ T9   (T9 exige T3, T4, T7, T8)

Fase 3: T10 ──→ T11 ──→ T12 ──→ T13   (sem [P]: gate full/e2e não é parallel-safe)

Fase 4: T14 ──→ T15 ──→ T16
```

`[P]` é informação de ordem (sem dependência entre si) — NÃO é diretiva de sub-agente por task. 4 fases ⇒ oferta de um sub-agente **por fase** na entrada do Execute.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 config de teste + smoke | ✅ Granular |
| T2, T3 | 2 primitivos minúsculos da mesma camada + export | ✅ Coeso (2 things, same layer) |
| T4 | tokens + 1 componente que os consome | ✅ Coeso |
| T5, T6, T7 | 1 arquivo/conceito cada (T6: 5 arquivos-irmãos triviais do mesmo padrão) | ✅ Granular |
| T8 | 2 exports de 1 linha + 1 componente + teste | ✅ Coeso |
| T9 | 1 página recomposta + seu spec e2e | ✅ Coeso (uma entrega verificável) |
| T10–T13 | 1 página/módulo por task + seu spec | ✅ Coeso (unidade de gate; dividir por componente quebraria a co-locação do e2e) |
| T14–T16 | 1 preocupação transversal por task | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | raiz | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T1, T2 | T2→T3 (T1 transitivo) | ✅ Match |
| T4 | T2 | T2→T4 [P] | ✅ Match |
| T5 | T1 | T1→T5 [P] | ✅ Match |
| T6 | T2 | T2→T6 [P] | ✅ Match |
| T7 | T1 | T1→T7 [P] | ✅ Match |
| T8 | T1 | T1→T8 [P] | ✅ Match |
| T9 | T3, T4, T7, T8 | T7,T8→T9 + nota (T3, T4) | ✅ Match |
| T10 | T2, T3 | Fase 3 header (T2, T3) | ✅ Match |
| T11 | T2, T3 | idem; sequência e2e T10→T11 | ✅ Match |
| T12 | T2, T3 | idem; T11→T12 | ✅ Match |
| T13 | T3 | idem; T12→T13 | ✅ Match |
| T14 | T9–T13 | Fase 4 após Fase 3 | ✅ Match |
| T15 | T9–T13 | T14→T15 (ordem de fase) | ✅ Match |
| T16 | T14, T15 | T15→T16 | ✅ Match |

Tasks [P] da mesma fase não dependem entre si (T4/T5/T6 e T7/T8: arquivos disjuntos, testes unit parallel-safe). Fase 3 sem [P] por gate e2e.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | infra de teste | unit (smoke) | unit | ✅ OK |
| T2 | primitivos UI | unit (RTL) | unit | ✅ OK |
| T3 | primitivos UI | unit (RTL) | unit | ✅ OK |
| T4 | tokens + componente de gráfico | unit (tokens) | unit | ✅ OK |
| T5 | error boundary (lógica reset) | unit (RTL) | unit | ✅ OK |
| T6 | loading.tsx presentational | none (build) | none | ✅ OK |
| T7 | componente com branches | unit (RTL) | unit | ✅ OK |
| T8 | componente com branches + exports | unit (RTL, modais mockados) | unit | ✅ OK |
| T9 | composição de página + fluxo | e2e | e2e | ✅ OK |
| T10–T13 | composição de página + fluxo | e2e | e2e | ✅ OK |
| T14 | fluxos responsivo/teclado | e2e | e2e | ✅ OK |
| T15 | tokens/contraste | unit | unit | ✅ OK |
| T16 | passes de qualidade (sem camada nova) | — | none + gate build | ✅ OK |

Nenhuma violação; nenhum teste diferido (o fluxo real dos atalhos é e2e no T9, a task que o torna executável — merge forward sancionado; T8 ainda carrega seu próprio teste unit).
