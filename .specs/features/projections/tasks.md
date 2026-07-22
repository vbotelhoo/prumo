# Previsibilidade Mensal (`projections`) — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/projections/design.md`
**Status**: Draft

**Ambiente**: rodar tudo com Node v22+ (Vitest 4 exige v22.13+): `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` nesta sandbox antes de qualquer `pnpm test:*`/`typecheck`/`lint` (constraint registrada no Handoff de commitments).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (gates obrigatórios antes de PR/main), `docs/TESTING.md` (pirâmide de testes), `vitest.config.ts` (projects unit/integration), `playwright.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `domain/` de projections (funções puras) | unit | Todas as branches; 1:1 com ACs da spec; toda edge case listada (fronteiras de mês, saldo negativo, mês zerado, `?month` inválido, virada de ano) | `src/modules/projections/__tests__/*.test.ts` | `pnpm test:unit` |
| `data/` dos módulos donos (queries agregadas novas) | integration | Caminhos-chave de query: split entrada/saída, status paga+prevista, fronteiras dia 01/último dia, mês vazio → 0, isolamento por `userId` (AD-012) | `src/modules/{transactions,commitments}/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| `services/` de projections (composição cross-módulo) | integration | Projeção completa vs cálculo manual; 2 usuários no mesmo mês; mês sem dados | `src/modules/projections/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Componentes React (server components) | none | — (sem testes de componente no repo; comportamento coberto via E2E) | — | build gate only |
| Página/rota + navegação (`src/app`) | e2e | Fluxos do roadmap: saldo correto com dados reais, navegação entre meses, mês zerado, isolamento com 2 contas, link de navegação | `e2e/projections.spec.ts` | `pnpm test:e2e` |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Funções puras, sem estado compartilhado | `src/shared/__tests__/money.test.ts`, `commitments/__tests__/installments.test.ts` |
| integration | No | Postgres único compartilhado; cleanup escopado por `testUserId` mas mesma base | `vitest.global-setup.ts` (um banco por run); lições do Handoff de commitments (cleanup global apagava seeds) |
| e2e | No | Banco compartilhado; specs não limpam dados que criam (por design, ver AGENTS.md) | `AGENTS.md` seção sobre banco sujo pós-E2E |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com unit tests | `pnpm typecheck && pnpm test:unit` |
| Full | Tasks com integration tests | `pnpm typecheck && pnpm test:unit && pnpm test:integration` |
| Build | Fim de fase / tasks com E2E / antes do PR | `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e` (ordem do AGENTS.md) |

Contagens de referência (não podem regredir — sem deleções silenciosas): **114 unit / 123 integration** passando em `main`.

---

## Execution Plan

### Phase 1: Fundações — queries nos donos + domínio puro

T1–T4 são independentes entre si (ordem livre). T3/T4 são `[P]` de fato (unit); T1/T2 rodam sequenciais porque a suíte de integração não é parallel-safe.

```
T1 (transactions query) ──┐
T2 (commitments query)  ──┤
T3 (domain projection)[P]─┼──→ Phase 2
T4 (domain month)     [P]─┘
```

### Phase 2: Serviço de composição

```
T1, T2, T3 ──→ T5 (getMonthlyProjection + integração 2 contas)
```

### Phase 3: UI, página e E2E

```
T3 ──→ T6 (ProjectionSummary) [P]─┐
T4 ──→ T7 (MonthNavigator)    [P]─┼──→ T8 (page + API pública + E2E) ──→ T9 (link em /app + E2E do link)
T5 ──────────────────────────────┘
```

---

## Task Breakdown

### T1: Query mensal agregada em `transactions`

**What**: Função `getMonthlyTransactionTotals(userId, month)` que retorna `{ entradas, saidas }` (`Money`) agregando no banco via `groupBy` por `type` com filtro `date startsWith "YYYY-MM-"`, exportada na API pública.
**Where**: `src/modules/transactions/data/transactions-repository.ts`, `src/modules/transactions/index.ts`, `src/modules/transactions/__tests__/transactions-repository.integration.test.ts`
**Depends on**: None
**Reuses**: padrão de repositório escopado por `userId` do próprio arquivo; padrão de setup com usuário real de `create-transaction.integration.test.ts` (CPF válido, cleanup por `testUserId`)
**Requirement**: PROJ-02, PROJ-03(a), PROJ-15

**Tools**: MCP: NONE · Skill: NONE (Read/Edit/Write + pnpm)

**Done when**:

- [ ] `groupBy` com `_sum.amount`; tipo ausente no resultado → `money(0)`
- [ ] Integration tests cobrem: mês com entradas e saídas (split correto), transação no dia 01 e no último dia do mês (dentro), dia fora do mês (fora), mês vazio → `{ 0, 0 }`, isolamento entre 2 usuários
- [ ] Export novo em `index.ts` sem quebrar boundaries lint
- [ ] Gate passa: `pnpm typecheck && pnpm test:unit && pnpm test:integration` (123 existentes + novos, sem deleções)

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add monthly totals aggregate query`

---

### T2: Query mensal de parcelas em `commitments`

**What**: Função `sumInstallmentsByMonth(userId, month)` que retorna `Money` via `aggregate` `_sum.amount` com filtro `dueDate startsWith "YYYY-MM-"` e qualquer status, exportada na API pública.
**Where**: `src/modules/commitments/data/commitments-repository.ts`, `src/modules/commitments/index.ts`, `src/modules/commitments/__tests__/commitments-repository.integration.test.ts`
**Depends on**: None
**Reuses**: padrão do repositório de commitments (denormalização de `userId` em `installment` existe para isso); setup de teste existente no mesmo arquivo
**Requirement**: PROJ-03(b), PROJ-05, PROJ-15

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `_sum.amount ?? 0` → `money(0)` quando não há parcelas no mês
- [ ] Integration tests cobrem: parcelas `prevista` E `paga` somadas juntas, vencimento no dia 01/último dia, parcela de outro mês fora, mês vazio → 0, isolamento entre 2 usuários
- [ ] Export novo em `index.ts` sem quebrar boundaries lint
- [ ] Gate passa: `pnpm typecheck && pnpm test:unit && pnpm test:integration` (sem deleções)

**Tests**: integration
**Gate**: full

**Commit**: `feat(commitments): add monthly installments sum query`

---

### T3: Domínio puro da projeção [P]

**What**: `MonthlyProjection` (types) e `buildMonthlyProjection({ month, entradas, saidasAvulsas, parcelasDoMes })` — fórmula pura sobre `Money`.
**Where**: `src/modules/projections/domain/types.ts`, `src/modules/projections/domain/projection.ts`, `src/modules/projections/__tests__/projection.test.ts`
**Depends on**: None
**Reuses**: `addMoney`, `subtractMoney`, `money` de `@/shared` (AD-008)
**Requirement**: PROJ-04, PROJ-05, PROJ-07, PROJ-13, PROJ-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `saidasPrevistas = saidasAvulsas + parcelasDoMes`; `saldoProjetado = entradas − saidasPrevistas`; `totalComprometido = parcelasDoMes`
- [ ] Unit tests 1:1 com ACs: fórmula com valores mistos, saldo negativo (entradas < saídas), tudo zero → 4 agregados 0, só parcelas → saídas = comprometido, entrada e saída de mesmo valor (sem dedupe)
- [ ] Gate passa: `pnpm typecheck && pnpm test:unit` (114 existentes + novos)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(projections): add monthly projection domain`

---

### T4: Domínio de mês (`YYYY-MM`) [P]

**What**: `parseMonthParam(raw, now?)`, `getCurrentMonth(now?)`, `previousMonth`, `nextMonth`, `formatMonthLabel` — strings puras, sem aritmética com `Date` (formatação via `Intl` com `timeZone: "UTC"`).
**Where**: `src/modules/projections/domain/month.ts`, `src/modules/projections/__tests__/month.test.ts`
**Depends on**: None
**Reuses**: lição dos bugs UTC/local de `addMonths` (design, Tech Decisions)
**Requirement**: PROJ-01, PROJ-10, PROJ-11, PROJ-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `parseMonthParam`: válido 2000-01..2100-12 passa; inválidos caem no mês corrente UTC de `now`: `undefined`, `"abc"`, `"2026-13"`, `"2026-00"`, `"1999-12"`, `"2101-01"`, `"2026-7"` (sem zero-pad)
- [ ] `previousMonth("2026-01") === "2025-12"` e `nextMonth("2026-12") === "2027-01"` (viradas de ano)
- [ ] `formatMonthLabel("2026-07") === "julho de 2026"`
- [ ] Gate passa: `pnpm typecheck && pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(projections): add month param parsing and navigation helpers`

---

### T5: Serviço `getMonthlyProjection`

**What**: `getMonthlyProjection(userId, month)` — `Promise.all` das duas queries dos donos + `buildMonthlyProjection`.
**Where**: `src/modules/projections/services/get-monthly-projection.ts`, `src/modules/projections/__tests__/get-monthly-projection.integration.test.ts`
**Depends on**: T1, T2, T3
**Reuses**: imports só via `@/modules/transactions` e `@/modules/commitments` (AD-010/AD-016); padrão de teste de integração com usuário real (CPF válido, cleanup escopado)
**Requirement**: PROJ-03, PROJ-13, PROJ-15, PROJ-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Integration tests: cenário completo (entradas + saídas avulsas + parcelas paga/prevista no mês) bate com cálculo manual dos 4 agregados; 2 usuários com dados no mesmo mês → cada projeção só reflete os próprios dados; mês sem dados → tudo 0; mês passado e futuro usam a mesma fórmula
- [ ] Boundaries lint verde (projections importa donos apenas via `index.ts`)
- [ ] Gate passa: `pnpm typecheck && pnpm test:unit && pnpm test:integration` (sem deleções)

**Tests**: integration
**Gate**: full

**Commit**: `feat(projections): add monthly projection service`

---

### T6: Componente `ProjectionSummary` [P]

**What**: Server component com os 4 `Card`s (entradas, saídas, saldo, comprometido); valores via `formatBRL`; saldo negativo com `text-destructive` e sinal; zeros sem alerta.
**Where**: `src/modules/projections/components/ProjectionSummary.tsx`
**Depends on**: T3
**Reuses**: `Card`, `formatBRL` de `@/shared`; padrões visuais dos cards de commitments
**Requirement**: PROJ-06, PROJ-07, PROJ-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Sem `"use client"`; recebe `MonthlyProjection` por props
- [ ] Saldo negativo: classe de alerta + valor formatado com sinal; saldo ≥ 0 sem alerta
- [ ] Gate passa: `pnpm typecheck && pnpm lint` (comportamento coberto pelo E2E de T8)

**Tests**: none (matriz: componentes → build gate; comportamento no E2E)
**Gate**: quick (typecheck + lint)

**Commit**: `feat(projections): add ProjectionSummary component`

---

### T7: Componente `MonthNavigator` [P]

**What**: Server component com título `formatMonthLabel(month)`, `<Link>`s para `?month=<previousMonth>`/`?month=<nextMonth>` e link "voltar ao mês atual" visível só quando `month !== getCurrentMonth()`.
**Where**: `src/modules/projections/components/MonthNavigator.tsx`
**Depends on**: T4
**Reuses**: `Button` (asChild/variant) de `@/shared`; `next/link`
**Requirement**: PROJ-09, PROJ-12, PROJ-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Sem `"use client"`; links carregam apenas `?month=YYYY-MM`
- [ ] Atalho "mês atual" ausente quando já está no mês corrente
- [ ] Gate passa: `pnpm typecheck && pnpm lint`

**Tests**: none (matriz: componentes → build gate; comportamento no E2E)
**Gate**: quick (typecheck + lint)

**Commit**: `feat(projections): add MonthNavigator component`

---

### T8: Página `/app/projections` + API pública + E2E

**What**: `page.tsx` (sessão → `parseMonthParam` → `getMonthlyProjection` → render), API pública `projections/index.ts`, e spec E2E `e2e/projections.spec.ts` cobrindo os fluxos do roadmap acessando a página por URL direta.
**Where**: `src/app/app/projections/page.tsx`, `src/modules/projections/index.ts`, `e2e/projections.spec.ts`
**Depends on**: T5, T6, T7
**Reuses**: esqueleto de `src/app/app/transactions/page.tsx` (searchParams assíncrono, sessão, throw Unauthorized); guard de redirect do layout `/app` (PROJ-08); helpers de signup/CPF dos specs E2E existentes (`commitments.spec.ts`)
**Requirement**: PROJ-01, PROJ-08, PROJ-10, PROJ-11, PROJ-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Página server component usa exclusivamente a API pública de `projections`; boundaries lint verde
- [ ] E2E: (a) conta nova cria entrada + saída avulsa + parcelamento 3x no mês corrente → os 4 cards batem com o cálculo manual (incluindo arredondamento da 1ª parcela); (b) navegar para os 2 meses seguintes mostra a parcela em saídas/comprometido; (c) `?month` inválido cai no mês corrente; (d) mês distante zerado mostra `R$ 0,00` nos 4 cards; (e) 2ª conta com dados próprios no mesmo mês vê só os próprios valores; (f) acesso sem sessão redireciona a `/login`
- [ ] Gate passa (Build): `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e` (sem deleções)

**Tests**: e2e
**Gate**: build

**Commit**: `feat(projections): add projections page with e2e coverage`

---

### T9: Link "Projeções" em `/app`

**What**: 4º card no grid de `/app` (📈 → `/app/projections`) com grid ajustado (`md:grid-cols-2 lg:grid-cols-4`), + teste E2E do link (navegar de `/app` até a projeção) adicionado a `e2e/projections.spec.ts`.
**Where**: `src/app/app/page.tsx`, `e2e/projections.spec.ts`
**Depends on**: T8
**Reuses**: cards/links existentes em `/app/page.tsx`
**Requirement**: PROJ-18

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Link visível em `/app` navega para `/app/projections`
- [ ] Grid não quebra com 4 itens (classes ajustadas)
- [ ] Gate passa (Build): `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e`

**Tests**: e2e
**Gate**: build

**Commit**: `feat(app): add projections shortcut to app home`

---

## Parallel Execution Map

```
Phase 1 (ordem livre entre T1–T4; T1/T2 sequenciais entre si — integração não é parallel-safe):
  T1 ──→ T2          (sequencial por causa da suíte de integração)
  T3 [P] ─┐
  T4 [P] ─┘          (unit puro, qualquer ordem)

Phase 2:
  T1, T2, T3 completos, então: T5

Phase 3:
  T3 → T6 [P] ─┐
  T4 → T7 [P] ─┼→ T8 ──→ T9
  T5 ──────────┘
```

**Parallelism constraint:** `[P]` é informação de ordenação (ordem livre), não diretiva de sub-agente. T1/T2 têm testes de integração (não parallel-safe) → executar um após o outro. 3 fases → execução inline, sem oferta de sub-agents.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: query mensal transactions | 1 função + export + testes co-locados | ✅ Granular |
| T2: query mensal commitments | 1 função + export + testes co-locados | ✅ Granular |
| T3: domínio projection | 1 função pura + types + testes | ✅ Granular |
| T4: domínio month | 1 arquivo coeso de helpers de mês + testes | ✅ Granular (2-3 funções relacionadas no mesmo arquivo) |
| T5: serviço | 1 função de composição + testes | ✅ Granular |
| T6: ProjectionSummary | 1 componente | ✅ Granular |
| T7: MonthNavigator | 1 componente | ✅ Granular |
| T8: página + index + E2E | 1 rota + entry point + spec E2E da rota | ✅ Coeso (wiring da rota; E2E co-locado conforme merge-forward — testes runnable pela primeira vez aqui) |
| T9: link em /app | 1 mudança de arquivo + 1 teste E2E | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | Phase 1, sem setas de entrada | ✅ Match |
| T2 | None | Phase 1, sem setas de entrada (ordem com T1 é constraint de teste, não dependência) | ✅ Match |
| T3 | None | Phase 1 [P] | ✅ Match |
| T4 | None | Phase 1 [P] | ✅ Match |
| T5 | T1, T2, T3 | T1, T2, T3 → T5 | ✅ Match |
| T6 | T3 | T3 → T6 | ✅ Match |
| T7 | T4 | T4 → T7 | ✅ Match |
| T8 | T5, T6, T7 | T5, T6, T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | `data/` módulo dono | integration | integration | ✅ OK |
| T2 | `data/` módulo dono | integration | integration | ✅ OK |
| T3 | `domain/` projections | unit | unit | ✅ OK |
| T4 | `domain/` projections | unit | unit | ✅ OK |
| T5 | `services/` projections | integration | integration | ✅ OK |
| T6 | componente React | none (build gate) | none | ✅ OK |
| T7 | componente React | none (build gate) | none | ✅ OK |
| T8 | página/rota `src/app` | e2e | e2e | ✅ OK |
| T9 | página `src/app` (modificação) | e2e | e2e | ✅ OK |
