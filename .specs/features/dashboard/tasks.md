# Dashboard — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/dashboard/design.md`
**Status**: Draft

**Ambiente**: rodar tudo com Node v22+ (Vitest 4 exige v22.13+): exportar o PATH do nvm v24 antes de qualquer `pnpm test:*`/`typecheck`/`lint` (memória do projeto, confirmada nas features `commitments`/`projections`).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (ordem de gates obrigatória antes de PR/main, aviso sobre não pular E2E), `docs/TESTING.md` (pirâmide de testes, AD-011), `vitest.config.ts` (projects unit/integration), `playwright.config.ts` (`fullyParallel: true`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `app/_lib/merge-category-spending.ts` (função pura) | unit | Todas as branches; 1:1 com DASH-04/05/07/18; edge cases: categoria só em transações, só em parcelas, em ambas (soma), lista de entrada vazia, duas categorias com nomes iguais e `categoryId` diferentes (não devem colapsar) | `src/app/app/_lib/__tests__/*.test.ts` | `pnpm test:unit` |
| `data/` dos módulos donos (3 queries novas: `transactions.getMonthlyExpensesByCategory`, `commitments.getMonthlyInstallmentsByCategory`, `commitments.listUnpaidInstallmentsForMonth`) | integration | Caminhos-chave: mês vazio → `[]`, categoria única, múltiplas categorias, soma correta por categoria, status `prevista` vs `paga` (só `prevista` na lista de vencimentos, ambos contam no total por categoria), `fixed_payment` tratado igual a `installment_payment` (DASH-17), isolamento por `userId` (AD-012) | `src/modules/{transactions,commitments}/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Componentes React novos (`CategorySpendingChart`, `UpcomingInstallmentsList`) | none (isoladamente) | — (sem testes de componente no repo; comportamento coberto via E2E na task que monta a página, mesmo padrão de `projections` T6/T7) | — | build gate only |
| Página `/app` (composição + ação de marcar como paga + E2E) | e2e | Resumo correto com dados reais, gráfico com soma avulsa+parcela por categoria, estado vazio (sem dados no mês), lista de vencimentos correta (exclui pagas), marcar como paga remove da lista sem mudar saldo/gráfico, saudação com nome do usuário e botão "Sair" preservados (regressão de `auth.spec.ts`), link "Projeções" preservado (regressão de `projections.spec.ts`), isolamento com 2 contas | `e2e/dashboard.spec.ts` | `pnpm test:e2e` |
| `package.json` (nova dependência `recharts`) | none | — (build gate valida peer-deps/tipos) | — | build gate only |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit | Yes | Função pura, sem estado compartilhado, mesmo padrão de `projections/__tests__/projection.test.ts` | `vitest.config.ts` project `unit` |
| integration | No | Postgres único compartilhado; `fileParallelism: false` no project `integration` | `vitest.config.ts:38` (comentário sobre paralelismo não seguro) |
| e2e | Sim entre specs de contas diferentes (cada teste cria conta única via `Date.now()`), mas suíte não é dona do banco — specs não limpam o que criam | Conta isolada por teste; banco compartilhado entre specs (mesmo padrão de `projections.spec.ts`) | `e2e/projections.spec.ts` (`signUp` com email único por teste); `AGENTS.md` (banco sujo pós-E2E é esperado, não regressão) |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com unit tests | `pnpm typecheck && pnpm test:unit` |
| Full | Tasks com integration tests | `pnpm typecheck && pnpm test:unit && pnpm test:integration` |
| Build | Fim de fase / tasks com dependência nova ou E2E / antes do PR | `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build` (ordem do `AGENTS.md`) |

Contagens de referência (não podem regredir — sem deleções silenciosas): **143 unit / 139 integration** passando em `main` (STATE.md Handoff, feature `projections`).

---

## Execution Plan

### Phase 1: Queries nos módulos donos + composição pura

T1/T2 são sequenciais entre si (integração não é parallel-safe, mesmo banco). T3 é `[P]` de fato (unit, função pura, sem dependência de código de T1/T2 — usa um tipo de entrada local estruturalmente compatível).

```
T1 (transactions: getMonthlyExpensesByCategory) ──┐
T2 (commitments: getMonthlyInstallmentsByCategory  │──→ Phase 2
    + listUnpaidInstallmentsForMonth)      ────────┤
T3 (mergeCategorySpending, pure)            [P]────┘
```

### Phase 2: Componentes de UI

```
T3 ──→ T4 (recharts + CategorySpendingChart) [P] ─┐
T2 ──→ T5 (UpcomingInstallmentsList)          [P] ─┼──→ Phase 3
T1 ─────────────────────────────────────────────────┘ (T6 também depende de T1 para o resumo por transações)
```

### Phase 3: Página + E2E

```
T1, T4, T5 ──→ T6 (page.tsx composição + e2e/dashboard.spec.ts)
```

---

## Task Breakdown

### T1: Query `getMonthlyExpensesByCategory` em `transactions`

**What**: Nova função no repositório de `transactions` que soma transações tipo `saida` do mês, agrupadas por `categoryId`, com `categoryName` resolvido; exportada na API pública do módulo.
**Where**: `src/modules/transactions/data/transactions-repository.ts` (nova função, ao lado de `getMonthlyTransactionTotals`), `src/modules/transactions/index.ts` (export), `src/modules/transactions/__tests__/transactions-repository.integration.test.ts` (novos testes)
**Depends on**: None
**Reuses**: Padrão `groupBy` + `monthPrefix` de `getMonthlyTransactionTotals` (`transactions-repository.ts:220-237`); `money()` de `@/shared`
**Requirement**: DASH-04, DASH-05, DASH-07 (metade transações), DASH-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `getMonthlyExpensesByCategory(userId: string, month: string): Promise<{ categoryId: string; categoryName: string; total: Money }[]>` implementada, só `type: "saida"`, categorias sem gasto não aparecem
- [x] Exportada em `src/modules/transactions/index.ts`
- [x] Teste de integração: mês vazio → `[]`; uma categoria com 2 transações → soma correta; duas categorias → 2 entradas; isolamento por `userId` (2ª conta não vaza)
- [x] Gate passa: `pnpm typecheck && pnpm test:unit && pnpm test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add getMonthlyExpensesByCategory query`

---

### T2: Queries `getMonthlyInstallmentsByCategory` e `listUnpaidInstallmentsForMonth` em `commitments`

**What**: Duas novas funções no repositório de `commitments` — soma de parcelas do mês (qualquer status) agrupadas por categoria do compromisso, e lista de parcelas `prevista` do mês ordenada por `dueDate` com descrição/categoria/valor denormalizados; ambas exportadas na API pública do módulo.
**Where**: `src/modules/commitments/data/commitments-repository.ts` (2 novas funções, ao lado de `sumInstallmentsByMonth`), `src/modules/commitments/index.ts` (exports), `src/modules/commitments/__tests__/commitments-repository.integration.test.ts` (novos testes)
**Depends on**: None
**Reuses**: Padrão `dueDate` `startsWith` `monthPrefix` de `sumInstallmentsByMonth` (`commitments-repository.ts:378-397`); padrão de `include: { commitment: { select: { description, category: { select: { name } } } } }` análogo ao `include: { category: { select: { name } } }` de `listCommitmentsByUser` (`commitments-repository.ts:20-32`); `Installment.userId` denormalizado evita join extra para o escopo por usuário
**Requirement**: DASH-04, DASH-07 (metade parcelas), DASH-08, DASH-09, DASH-11, DASH-17, DASH-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `getMonthlyInstallmentsByCategory(userId, month): Promise<{ categoryId; categoryName; total: Money }[]>` — soma parcelas com `dueDate` no mês agrupadas por `commitment.categoryId`, qualquer `status` (paga conta igual a prevista, herdado de PROJ)
- [x] `listUnpaidInstallmentsForMonth(userId, month): Promise<{ installmentId; commitmentId; description; categoryName; amount: Money; dueDate }[]>` — só `status: "prevista"`, `dueDate` no mês, `orderBy: { dueDate: "asc" }`
- [x] Ambas exportadas em `src/modules/commitments/index.ts`
- [x] Teste de integração `getMonthlyInstallmentsByCategory`: mês vazio → `[]`; parcela paga + parcela prevista na mesma categoria → soma as duas; compromisso `fixed_payment` soma igual a `installment_payment`; isolamento por `userId`
- [x] Teste de integração `listUnpaidInstallmentsForMonth`: parcela paga não aparece; ordenação por `dueDate` asc; mês vazio → `[]`; isolamento por `userId`
- [x] Gate passa: `pnpm typecheck && pnpm test:unit && pnpm test:integration`

**Tests**: integration
**Gate**: full

**Commit**: `feat(commitments): add category totals and unpaid-installments queries`

---

### T3: `mergeCategorySpending` (função pura) [P]

**What**: Função pura que combina os dois arrays de totais por categoria (transações + parcelas) somando por `categoryId`, ordenada por total decrescente.
**Where**: `src/app/app/_lib/merge-category-spending.ts`, `src/app/app/_lib/__tests__/merge-category-spending.test.ts`
**Depends on**: None (tipo de entrada `{ categoryId; categoryName; total: Money }` definido localmente, estruturalmente compatível com o retorno de T1/T2 sem importar dos módulos)
**Reuses**: `addMoney` de `@/shared` (AD-008, nunca `+` cru em centavos)
**Requirement**: DASH-04, DASH-05, DASH-07, DASH-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `mergeCategorySpending(transactionTotals, commitmentTotals): { categoryId; categoryName; total: Money }[]` implementada e exportada
- [x] Testes unitários: categoria só em transações; categoria só em parcelas; categoria nas duas (soma via `addMoney`); ambos arrays vazios → `[]`; duas categorias com `categoryName` igual e `categoryId` diferente permanecem separadas (DASH-18); resultado ordenado por `total` decrescente
- [x] Gate passa: `pnpm typecheck && pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(dashboard): add mergeCategorySpending pure function`

---

### T4: Dependência `recharts` + componente `CategorySpendingChart` [P]

**What**: Adiciona `recharts` como dependência e cria o componente client que renderiza o gráfico donut de gastos por categoria (paleta categórica determinística por índice, sem cor persistida — spec Assumptions), com estado vazio quando a lista está vazia.
**Where**: `package.json` (+ `recharts`), `src/app/app/_components/CategorySpendingChart.tsx`
**Depends on**: T3 (tipo `CategorySpendingSlice`)
**Reuses**: `formatBRL` de `@/shared` para valores no tooltip/legenda
**Requirement**: DASH-04, DASH-06

**Tools**:

- MCP: NONE
- Skill: `dataviz` (obrigatório antes de escrever a lógica de cor/legenda do gráfico — convenção do projeto para qualquer gráfico novo, primeira vez que `recharts` é usado no repo)

**Done when**:

- [x] `recharts@^3` instalado; nenhuma versão alternativa fixada sem checar compatibilidade com React 19.2/Next 16.2 já usados no projeto
- [x] `CategorySpendingChart({ data: CategorySpendingSlice[] })` — `"use client"`; gráfico donut com legenda; `data.length === 0` renderiza estado vazio ("Nenhum gasto neste mês") em vez de gráfico quebrado
- [x] Cores por categoria: paleta fixa cicladas por índice pós-ordenação (mesma categoria = mesma cor dentro do render), decidida seguindo a skill `dataviz`
- [x] Gate passa (peer-deps/tipos da dependência nova validados imediatamente): `pnpm lint && pnpm typecheck && pnpm build`

**Tests**: none (componente; comportamento coberto no E2E de T6, mesmo padrão de `ProjectionSummary`/`MonthNavigator` em `projections`)
**Gate**: build

**Commit**: `feat(dashboard): add recharts dependency and CategorySpendingChart component`

---

### T5: Componente `UpcomingInstallmentsList` [P]

**What**: Componente client que lista as parcelas não pagas do mês (descrição, categoria, valor, vencimento) com ação de marcar como paga por linha.
**Where**: `src/app/app/_components/UpcomingInstallmentsList.tsx`
**Depends on**: T2 (tipo `UpcomingInstallment`, `setInstallmentStatusAction`)
**Reuses**: `setInstallmentStatusAction` de `@/modules/commitments`; padrão `useTransition` + `router.refresh()` de `CommitmentsPageClient.tsx:39-45`; `formatBRL` de `@/shared`
**Requirement**: DASH-08, DASH-09, DASH-10, DASH-11, DASH-12, DASH-13, DASH-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `UpcomingInstallmentsList({ installments: UpcomingInstallment[] })` — `"use client"`; lista vazia renderiza estado vazio ("Nenhuma parcela pendente este mês")
- [x] Cada linha mostra descrição, categoria, valor (`formatBRL`) e vencimento; botão "Marcar como paga" chama `setInstallmentStatusAction({ installmentId, status: "paga" })`
- [x] Ação bem-sucedida (`{ ok: true }`) dispara `router.refresh()`; ação com erro (`{ ok: false, error }`) mantém o item e mostra mensagem inline (diferente de `CommitmentsPageClient`, que hoje ignora o resultado — ver Risks do design)
- [x] Gate passa: `pnpm lint && pnpm typecheck`

**Tests**: none (componente; comportamento coberto no E2E de T6)
**Gate**: quick

**Commit**: `feat(dashboard): add UpcomingInstallmentsList component`

---

### T6: Página `/app` (composição) + E2E

**What**: Reescreve `src/app/app/page.tsx` como o dashboard — sessão → mês atual (`getCurrentMonth`) → fetch paralelo (`getMonthlyProjection`, `getMonthlyExpensesByCategory`, `getMonthlyInstallmentsByCategory`, `listUnpaidInstallmentsForMonth`) → `mergeCategorySpending` → render (`ProjectionSummary` + `CategorySpendingChart` + `UpcomingInstallmentsList` + cards de navegação existentes, mantidos abaixo). Cria `e2e/dashboard.spec.ts`.
**Where**: `src/app/app/page.tsx`, `e2e/dashboard.spec.ts`
**Depends on**: T1, T4, T5
**Reuses**: Esqueleto sessão/guard de `src/app/app/projections/page.tsx:18-24`; `ProjectionSummary`/`getMonthlyProjection`/`getCurrentMonth` de `@/modules/projections` (sem alterações); markup atual dos 4 cards de navegação de `src/app/app/page.tsx` (mantido); helpers de signup/transação/compromisso já existentes em `e2e/projections.spec.ts`
**Requirement**: DASH-01, DASH-02, DASH-03, DASH-04 a DASH-18 (fluxo completo), Success Criteria da spec

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Página server component sem `searchParams` (sem navegação de mês, spec); usa exclusivamente as APIs públicas dos módulos; boundaries lint verde
- [x] Saudação `Olá, {name}!` e botão "Sair" preservados (regressão de `e2e/auth.spec.ts`: `getByText(name)` e `getByRole("button", { name: "Sair" })` em `/app`)
- [x] 4 cards de navegação preservados com o mesmo texto (regressão de `e2e/projections.spec.ts`, teste "projections link in /app home navigates to projections": `button:has-text("Projeções")`)
- [x] E2E (`e2e/dashboard.spec.ts`): (a) conta nova com entrada + saída avulsa + parcelamento no mês corrente → resumo bate com o mesmo cálculo de `projections.spec.ts`; (b) gráfico mostra soma de saída avulsa + parcela na mesma categoria em uma única fatia (DASH-07); (c) mês sem nenhum dado → resumo zerado, gráfico com estado vazio, lista de vencimentos com estado vazio (DASH-02/06/10); (d) parcela `prevista` do mês aparece na lista, parcela `paga` não aparece (DASH-09); (e) marcar como paga pela lista remove o item sem navegação de página inteira, e resumo/gráfico continuam contando a parcela (DASH-13/15); (f) 2ª conta no mesmo mês só vê os próprios dados (AD-012); (g) acesso sem sessão redireciona a `/login`
- [x] Gate passa (Build): `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build` (sem deleções — baseline 143 unit / 139 integration não pode regredir)
- [x] `ROADMAP.md` item 6 atualizado para concluída (AGENTS.md: parte do gate de conclusão, não commit separado)

**Tests**: e2e
**Gate**: build

**Commit**: `feat(dashboard): compose /app as monthly dashboard with e2e coverage`

---

## Parallel Execution Map

```
Phase 1:
  T1 ──→ T2 (sequencial, integração compartilha banco)
  T3 [P] (independente)

Phase 2 (após T1/T2/T3):
    ├── T4 [P] (depende de T3)
    └── T5 [P] (depende de T2)

Phase 3:
  T1, T4, T5 completos ──→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: `getMonthlyExpensesByCategory` | 1 função, 1 módulo | ✅ Granular |
| T2: 2 funções em `commitments-repository.ts` | 2 funções cohesivas, mesmo arquivo, mesma necessidade (dashboard) | ⚠️ OK — cohesivas, evita 2 tasks tocando o mesmo arquivo em paralelo |
| T3: `mergeCategorySpending` | 1 função pura | ✅ Granular |
| T4: dependência + 1 componente | 1 componente + 1 dependência que o habilita | ⚠️ OK — dependência só existe para este componente, inseparável |
| T5: `UpcomingInstallmentsList` | 1 componente | ✅ Granular |
| T6: página + E2E | 1 arquivo de composição + 1 spec E2E do feature inteiro | ⚠️ OK — mesmo padrão de `projections` T8 (página + API pública + E2E bundled) |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Nenhuma seta de entrada | ✅ Match |
| T2 | None (execução sequencial após T1 por causa do banco, não dependência de código) | Seta T1 → T2 (ordem de execução) | ✅ Match |
| T3 | None | Nenhuma seta de entrada, marcado `[P]` | ✅ Match |
| T4 | T3 | Seta T3 → T4 | ✅ Match |
| T5 | T2 | Seta T2 → T5 | ✅ Match |
| T6 | T1, T4, T5 | Setas T1 → T6, T4 → T6, T5 → T6 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: `getMonthlyExpensesByCategory` | `data/` (transactions) | integration | integration | ✅ OK |
| T2: queries `commitments` | `data/` (commitments) | integration | integration | ✅ OK |
| T3: `mergeCategorySpending` | `app/_lib` (função pura) | unit | unit | ✅ OK |
| T4: `CategorySpendingChart` + dep | Componente React + config | none (build gate; comportamento no E2E de T6) | none | ✅ OK |
| T5: `UpcomingInstallmentsList` | Componente React | none (build gate; comportamento no E2E de T6) | none | ✅ OK |
| T6: página + E2E | Página `/app` (composição) | e2e | e2e | ✅ OK |

Nenhuma violação — T4/T5 declaram `Tests: none` exatamente onde a matriz permite (componentes sem teste de componente no repo), e seu comportamento é absorvido pelo E2E de T6 (mesmo padrão já usado em `projections` T6/T7 → T8), não "testado em outra task" como desculpa solta.
