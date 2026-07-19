# Commitments Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/commitments/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase sampling + project guidelines. Guidelines found: `vitest.config.ts` (projects: unit / integration; integration `fileParallelism: false`), `playwright.config.ts` (E2E). Strong defaults applied where no explicit coverage threshold is configured. Same conventions as feature 3 (`categories-transactions`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain pure functions (`installments.ts`: split, schedule, materialize, regenerate, progress) | unit | **All branches; 1:1 to spec ACs; AD-009 invariant (sum == total) + every listed edge case** (clamp fim-de-mês, resto na 1ª, frozen/pagas, rejeições) | `src/modules/commitments/__tests__/*.test.ts` | `pnpm test:unit` |
| Domain schemas / types / constants | unit | All branches; every value bound (mode enum, N 2–360, descrição 1–140, data window, amountRaw vazio) | `src/modules/commitments/__tests__/*.test.ts` | `pnpm test:unit` |
| Data layer / repository | integration | All public functions: happy path + error cases + AD-012 isolation (userId em toda query) + `$transaction` atômica | `src/modules/commitments/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Actions (core functions — testable layer) | integration | All branches: happy path + every listed edge case + error paths + AD-012 isolation | `src/modules/commitments/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| React components (`"use client"`) | none | — (build gate only; E2E cobre o comportamento de UI ponta a ponta) | — | `pnpm build && pnpm lint` |
| Server component / App Router page + nav | none | — (build gate only; E2E cobre a jornada) | — | `pnpm build && pnpm lint` |
| Prisma schema / migration / shadcn setup | none | — (build gate only: `prisma generate` + `pnpm build` pass) | — | `pnpm build && pnpm lint` |
| E2E user flow | e2e | Full flow: login → criar parcelamento (R$100 em 3x) → ver 33,34/33,33/33,33 + vencimentos → marcar 1ª paga → progresso 1/3 | `e2e/*.spec.ts` | `pnpm test:e2e` |

## Parallelism Assessment

> Generated from `vitest.config.ts` (integration project `fileParallelism: false`) and `playwright.config.ts`.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Funções puras; sem estado compartilhado; sem DB | `installments.ts`/`schemas.ts` são chamadas puras sem efeitos colaterais |
| integration | **No** | PostgreSQL único compartilhado; sem schema por-teste | `vitest.config.ts` → projeto integration: `fileParallelism: false` |
| e2e | No | Next.js server + DB compartilhados; E2E cria a própria conta para evitar contaminação | `playwright.config.ts` `webServer` com `DATABASE_URL` compartilhado |

## Gate Check Commands

> Generated from `package.json` scripts.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tasks só com testes unitários | `pnpm test:unit` |
| Full | Após tasks com testes de integração | `pnpm test:integration` |
| Build | Após tasks de schema/migration/componente/config (sem testes) | `pnpm build && pnpm lint` |
| E2E | Gate final após page + componentes ligados | `pnpm test:e2e` |

---

## Execution Plan

### Phase 1: Database Schema (Sequential)

Estabelece os models Prisma e a migration antes de qualquer camada referenciar tipos de DB.

```
T1 → T2
```

### Phase 2: Domain + shadcn (Parallel + Sequential)

T3 (types+constants) é base de T4/T5. T4 e T5 têm testes unitários (parallel-safe) → `[P]`. T6 (shadcn) é independente.

```
           ┌── T4 [P] ──┐
T3 ────────┤            ├── Phase 2 done
           └── T5 [P] ──┘
(no dep) ── T6 [P] ─────────┘
```

### Phase 3: Data Layer (Sequential)

Repositório com testes de integração (não parallel-safe).

```
T7
```

T7 depende de T2 (migration aplicada), T3 (tipos).

### Phase 4: Actions + cores (Sequential)

Todas as actions têm testes de integração → sequenciais (`fileParallelism: false`).

```
T8 → T9 → T10 → T11
```

### Phase 5: Components + Page + E2E (Parallel + Sequential)

Componentes sem testes (build gate) → `[P]` onde não há dependência de código. Index/page/nav ligam tudo; E2E fecha.

```
T12 [P] ──┐
T13 [P] ──┼──→ T15 ──→ T16 ──→ T17
T14 [P] ──┘
```

---

> **Sub-agent offer:** Esta feature tem **5 fases** (>3 threshold). Durante o Execute, oferecer um worker por fase (sequencial). Workers reportam um resumo compacto antes do próximo ser despachado. O Verifier roda automaticamente após a última task, independente da contagem de fases. Ver `tlc-spec-driven` skill → sub-agents.md.

---

## Task Breakdown

### T1: Prisma schema — Commitment + Installment models

**What**: Adicionar models `Commitment` e `Installment` a `prisma/schema.prisma`; back-relations `commitments`/`installments` em `User` e `commitments` em `Category`. FK `Commitment.category` `onDelete: Restrict`; `Installment.commitment` `onDelete: Cascade`; índices em `userId`/`commitmentId`. Categoria **só no pai** (Opção B).
**Where**: `prisma/schema.prisma` (modify)
**Depends on**: None
**Reuses**: Model `User` existente; convenções do schema (datas String, sem enum Prisma)
**Requirement**: CMT-02, CMT-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Models `Commitment`/`Installment` conforme design (categoria só em `Commitment`)
- [ ] Back-relations adicionadas a `User` e `Category`
- [ ] FKs e índices corretos; `prisma format` + `prisma validate` passam
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): add Commitment and Installment Prisma models`

---

### T2: Migration `commitments`

**What**: Gerar e aplicar migration `prisma migrate dev --name commitments`; verificar SQL gerado (tabelas `commitment`/`installment`, FKs, índices).
**Where**: `prisma/migrations/*_commitments/` (novo)
**Depends on**: T1
**Reuses**: Workflow de migration da feature 3
**Requirement**: CMT-02, CMT-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Migration aplicada localmente sem erro; `prisma generate` OK
- [ ] SQL cria `commitment`/`installment` com FK Restrict (category) e Cascade (commitment→installment)
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): add commitments migration`

---

### T3: Domain types + constants

**What**: `domain/types.ts` (`CommitmentMode`, `InstallmentStatus`, `Installment`, `Commitment`, `CommitmentProgress`, `CreateCommitmentInput`, `EditScope`) e `domain/constants.ts` (mensagens de erro).
**Where**: `src/modules/commitments/domain/types.ts`, `constants.ts` (novos)
**Depends on**: None
**Reuses**: `Money` de `@/shared/money`; padrão de `transactions/domain`
**Requirement**: CMT-04, CMT-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Tipos e constantes exportados conforme design (parcela **sem** categoria própria)
- [ ] Sem erros de TypeScript
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): add domain types and constants`

---

### T4: Domain — funções puras `installments.ts` + unit tests [P]

**What**: `splitInstallments`, `scheduleDueDates`, `materialize`, `regeneratePrevistas`, `computeProgress` (design comp. 2) + testes unitários cobrindo a **invariante AD-009** e todos os edge cases.
**Where**: `src/modules/commitments/domain/installments.ts` + `src/modules/commitments/__tests__/installments.test.ts`
**Depends on**: T3
**Reuses**: Aritmética pura; padrão de teste de `shared/__tests__/money.test.ts`
**Requirement**: CMT-02, CMT-03, CMT-07, CMT-14, CMT-15, CMT-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `splitInstallments`: soma == total para vários (total,N); sobra na 1ª (100,00/3 → [3334,3333,3333]); resto 0 quando divisível
- [ ] `scheduleDueDates`: cadência mensal; clamp fim-de-mês (31/01→28/02→31/03); âncora reexpande; virada de ano; `startOffset`
- [ ] `materialize`: parcelada (total=input) vs financiamento (total=parcela×N, iguais)
- [ ] `regeneratePrevistas`: pagas congeladas; soma(frozen)+soma(regen)==novo total; rejeita total<pago, N<pagas, parcela<1 centavo; scope "futuras" congela previstas vencidas
- [ ] `computeProgress`: pagas/total, pago, saldo, isSettled, percent
- [ ] Gate: `pnpm test:unit` · Test count registrado (sem deleções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(commitments): add installment math domain functions with tests`

---

### T5: Domain — schemas Zod + unit tests [P]

**What**: `domain/schemas.ts` (`commitmentModeSchema`, `createCommitmentInputSchema`, `updateCommitmentInputSchema` com `scope`, `setInstallmentStatusSchema`) + testes unitários.
**Where**: `src/modules/commitments/domain/schemas.ts` + `src/modules/commitments/__tests__/schemas.test.ts`
**Depends on**: T3
**Reuses**: Padrão de `transactions/domain/schemas.ts` (janela de data, `maxDate()`)
**Requirement**: CMT-04, CMT-05, CMT-13, CMT-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Schemas conforme design; `scope` default `"todas"`; `status` alvo no toggle
- [ ] Testes: mode enum inválido; N < 2 e > 360; descrição vazia/>140; data fora da janela; amountRaw vazio
- [ ] Gate: `pnpm test:unit` · Test count registrado

**Tests**: unit
**Gate**: quick

**Commit**: `feat(commitments): add Zod schemas with tests`

---

### T6: shadcn — Progress + RadioGroup [P]

**What**: `npx shadcn@latest add progress radio-group`; exportar em `src/shared/index.ts`.
**Where**: `src/shared/components/ui/progress.tsx`, `radio-group.tsx` + `src/shared/index.ts` (modify)
**Depends on**: None
**Reuses**: Setup shadcn existente (Dialog/Select da feature 3)
**Requirement**: CMT-06, CMT-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Componentes adicionados e exportados no `shared/index.ts`
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(shared): add Progress and RadioGroup ui components`

---

### T7: Data — `commitments-repository.ts` + integration tests

**What**: Repositório com `listCommitmentsByUser`, `getCommitmentForUser`, `createCommitmentWithInstallments` (atômico), `replacePrevistaInstallments` (atômico, renumera), `deleteCommitment` (preserva pagas), `setInstallmentStatus` (idempotente) + testes de integração.
**Where**: `src/modules/commitments/data/commitments-repository.ts` + `src/modules/commitments/__tests__/commitments-repository.integration.test.ts`
**Depends on**: T2, T3
**Reuses**: Padrão de `transactions-repository.ts` (`AppError`, `money()`, `updateMany/deleteMany` filtrando `{id,userId}`, `$transaction`)
**Requirement**: CMT-05, CMT-08, CMT-10, CMT-12, CMT-16, CMT-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Criação atômica materializa pai + N parcelas numeradas
- [ ] `replacePrevistaInstallments` deleta previstas, insere regeneradas, mantém pagas, renumera por dueDate
- [ ] `deleteCommitment`: sem pagas remove tudo; com pagas remove só previstas + mantém pai
- [ ] `setInstallmentStatus` idempotente p/ estado desejado; `{id,userId}`
- [ ] Isolamento (AD-012): usuário B nunca lê/muta dado de A (teste explícito)
- [ ] Gate: `pnpm test:integration` · Test count registrado

**Tests**: integration
**Gate**: full

**Commit**: `feat(commitments): add commitments repository with integration tests`

---

### T8: Action — criar compromisso (core + wrapper) + integration tests

**What**: `create-commitment-core.ts` + `create-commitment-action.ts` (sessão → Zod → parseBRL → categoria de saída via `@/modules/categories` → `materialize` → repo) + testes de integração (parcelada e financiamento).
**Where**: `src/modules/commitments/actions/create-commitment-{core,action}.ts` + `.../__tests__/create-commitment.integration.test.ts`
**Depends on**: T4, T5, T7
**Reuses**: `create-transaction-core.ts` (estrutura do Result, extração de fieldErrors); `findCategoryForUser` de `@/modules/categories`
**Requirement**: CMT-01, CMT-04, CMT-05, CMT-06, CMT-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Parcelada: materializa N, **arredondamento na 1ª**, soma == total, vencimentos corretos
- [ ] Financiamento: total = parcela×N; parcelas iguais; teto de `parcela×N`
- [ ] Rejeita parcela < 1 centavo; categoria não-saída/de-outro-usuário; valor/N/data inválidos; `userId` da sessão (nunca do payload)
- [ ] Gate: `pnpm test:integration` · Test count registrado

**Tests**: integration
**Gate**: full

**Commit**: `feat(commitments): add create-commitment action with tests`

---

### T9: Action — marcar/desmarcar parcela (core + wrapper) + integration tests

**What**: `set-installment-status-{core,action}.ts` (sessão → Zod → `setInstallmentStatus` idempotente) + testes de integração.
**Where**: `src/modules/commitments/actions/set-installment-status-{core,action}.ts` + `.../__tests__/installment-status.integration.test.ts`
**Depends on**: T5, T7
**Reuses**: Padrão core+wrapper; Result discriminado
**Requirement**: CMT-11, CMT-12

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Marca prevista→paga e paga→prevista; ordem livre
- [ ] Idempotente p/ estado desejado (definir "paga" 2× = "paga")
- [ ] Parcela de outro usuário / inexistente → rejeitada (AD-012)
- [ ] Gate: `pnpm test:integration` · Test count registrado

**Tests**: integration
**Gate**: full

**Commit**: `feat(commitments): add set-installment-status action with tests`

---

### T10: Action — editar compromisso (core + wrapper) + integration tests

**What**: `update-commitment-{core,action}.ts` (sessão → Zod `updateCommitmentInputSchema` → categoria no pai → `frozen` set por `scope` → `regeneratePrevistas` → `replacePrevistaInstallments`) + testes de integração.
**Where**: `src/modules/commitments/actions/update-commitment-{core,action}.ts` + `.../__tests__/update-commitment.integration.test.ts`
**Depends on**: T4, T5, T7
**Reuses**: `update-transaction-core.ts`; `regeneratePrevistas` (T4)
**Requirement**: CMT-13, CMT-14, CMT-15, CMT-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Redistribui só previstas com **pagas intactas**; soma mantém == novo total
- [ ] Rejeita novo total < soma paga (`TOTAL_BELOW_PAID_ERROR`) e N < pagas (`COUNT_BELOW_PAID_ERROR`)
- [ ] scope `todas` vs `futuras` (valor); trocar **categoria** afeta o compromisso inteiro (Opção B)
- [ ] Compromisso de outro usuário / inexistente → rejeitado (AD-012)
- [ ] Gate: `pnpm test:integration` · Test count registrado

**Tests**: integration
**Gate**: full

**Commit**: `feat(commitments): add update-commitment action with tests`

---

### T11: Action — excluir compromisso (core + wrapper) + integration tests

**What**: `delete-commitment-{core,action}.ts` (sessão → `deleteCommitment`) + testes de integração; inclui teste do bloqueio de exclusão de categoria em uso (FK Restrict).
**Where**: `src/modules/commitments/actions/delete-commitment-{core,action}.ts` + `.../__tests__/delete-commitment.integration.test.ts`
**Depends on**: T7
**Reuses**: `delete-transaction-core.ts`
**Requirement**: CMT-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Sem pagas: remove compromisso + parcelas; com pagas: remove só previstas, preserva pagas
- [ ] Compromisso de outro usuário / inexistente → rejeitado (AD-012)
- [ ] Excluir categoria usada por um compromisso → bloqueada por FK Restrict (edge case)
- [ ] Gate: `pnpm test:integration` · Test count registrado

**Tests**: integration
**Gate**: full

**Commit**: `feat(commitments): add delete-commitment action with tests`

---

### T12: Component — `CommitmentModal` + `EditScopeDialog` [P]

**What**: Modal de criação/edição com `RadioGroup` de modo (parcelada/financiamento), campos e pré-preenchimento na edição; `EditScopeDialog` (todas/futuras — só para valor). Chamam create/update actions + `router.refresh()`.
**Where**: `src/modules/commitments/components/CommitmentModal.tsx`, `EditScopeDialog.tsx` (novos, `"use client"`)
**Depends on**: T6, T8, T10
**Reuses**: `TransactionModal.tsx` (estrutura); Dialog/Select/Input/RadioGroup de `@/shared`; lição L-009 (`router.refresh()`)
**Requirement**: CMT-01, CMT-06, CMT-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Modo alterna rótulo do valor (total ↔ parcela); campos validam client-side
- [ ] Edição pré-preenche; `EditScopeDialog` aparece só ao mudar valor com >1 prevista
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): add CommitmentModal and EditScopeDialog`

---

### T13: Component — lista, card, parcelas, estado vazio [P]

**What**: `CommitmentList`, `CommitmentCard` (progresso pagas/total, pago, saldo, `<Progress>`, badge "Quitado"), `InstallmentList` (toggle de status via action), `CommitmentsEmptyState`.
**Where**: `src/modules/commitments/components/{CommitmentList,CommitmentCard,InstallmentList,CommitmentsEmptyState}.tsx` (novos, `"use client"`)
**Depends on**: T4, T6, T9, T11
**Reuses**: `TransactionList`/`TransactionsEmptyState`; `formatBRL`; `computeProgress` (T4); lição L-009
**Requirement**: CMT-08, CMT-09, CMT-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Card mostra progresso/pago/saldo/percent e badge "Quitado" quando `isSettled`
- [ ] `InstallmentList` toggla status (alvo = oposto ao atual) + `router.refresh()`
- [ ] Estado vazio com CTA; nunca tela em branco
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): add commitment list, card, installments, empty state`

---

### T14: Component — `DeleteCommitmentDialog` [P]

**What**: Confirmação de exclusão; texto adapta (com pagas: só previstas removidas, pagas preservadas). Chama `deleteCommitmentAction` + `router.refresh()`.
**Where**: `src/modules/commitments/components/DeleteCommitmentDialog.tsx` (novo, `"use client"`)
**Depends on**: T11
**Reuses**: `DeleteTransactionDialog.tsx`
**Requirement**: CMT-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Variante com/sem pagas com mensagem correta; botão destrutivo + spinner
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): add DeleteCommitmentDialog`

---

### T15: Component — `CommitmentsPageClient` (coordenador)

**What**: Client component que coordena estado (modal, editing, deleting, editScope pendente) e compõe `CommitmentList + CommitmentModal + EditScopeDialog + DeleteCommitmentDialog`; recebe `commitments`/`categories` (só saída) como props.
**Where**: `src/modules/commitments/components/CommitmentsPageClient.tsx` (novo, `"use client"`)
**Depends on**: T12, T13, T14
**Reuses**: `TransactionsPageClient.tsx`
**Requirement**: CMT-08, CMT-13, CMT-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Compõe os componentes; abre modal (criar/editar), scope dialog, delete dialog; filtra categorias de saída para o modal
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): add CommitmentsPageClient coordinator`

---

### T16: Public API + page + navegação

**What**: `commitments/index.ts` (tipos + `listCommitmentsByUser` + 4 actions + `CommitmentsPageClient`); `src/app/app/commitments/page.tsx` (server, `Promise.all` de compromissos + categorias); link "Compromissos" no `/app` layout.
**Where**: `src/modules/commitments/index.ts`, `src/app/app/commitments/page.tsx` (novos), `src/app/app/layout.tsx` (modify)
**Depends on**: T7, T8, T9, T10, T11, T15
**Reuses**: `transactions/index.ts`; `transactions/page.tsx`; layout de `/app`
**Requirement**: CMT-08, CMT-09, CMT-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `index.ts` exporta a API pública (só via este arquivo — AD-010)
- [ ] Página carrega compromissos + categorias e renderiza `CommitmentsPageClient`; rota protegida herdada de `/app`
- [ ] Link de navegação visível; `pnpm lint` sem violação de fronteira
- [ ] Gate: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(commitments): wire public API, page and navigation`

---

### T17: E2E — fluxo de parcelamento

**What**: `e2e/commitments.spec.ts`: login → criar parcelamento R$ 100,00 em 3x → verificar 3 parcelas (33,34 / 33,33 / 33,33) com vencimentos mensais → marcar 1ª parcela como paga → progresso "1/3".
**Where**: `e2e/commitments.spec.ts` (novo)
**Depends on**: T16
**Reuses**: `e2e/transactions.spec.ts` (helpers de signup/login); lição L-006 (`getByRole`, não `getByText({selector})`)
**Requirement**: CMT-18

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Fluxo completo verde; asserção do **arredondamento** e do **toggle de pagamento**
- [ ] Usa conta própria (sem depender de estado de outros testes — AD-011)
- [ ] Gate: `pnpm test:e2e`

**Tests**: e2e
**Gate**: e2e

**Commit**: `test(commitments): add installment e2e flow`

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 schema | 1 arquivo (models) | ✅ Granular |
| T2 migration | 1 migration | ✅ Granular |
| T3 types+constants | 2 arquivos coesos (declarações de domínio) | ✅ OK |
| T4 installments + tests | 1 arquivo + testes | ✅ Granular |
| T5 schemas + tests | 1 arquivo + testes | ✅ Granular |
| T6 shadcn | 2 componentes de UI (setup) | ✅ OK |
| T7 repository + tests | 1 arquivo (data-access coeso) | ✅ Granular |
| T8–T11 actions | 1 caso de uso cada (core+wrapper) | ✅ Granular |
| T12 modal + scope dialog | 2 componentes do fluxo de form | ✅ OK (coeso) |
| T13 lista/card/parcelas/vazio | 4 componentes de exibição coesos | ⚠️ OK (mesma tela; um commit de UI de listagem) |
| T14 delete dialog | 1 componente | ✅ Granular |
| T15 page client | 1 coordenador | ✅ Granular |
| T16 index+page+nav | wiring coeso (3 arquivos) | ✅ OK |
| T17 e2e | 1 spec | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | — | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | None | (raiz Phase 2) | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T3 | T3→T5 | ✅ |
| T6 | None | independente | ✅ |
| T7 | T2, T3 | Phase 3 (após Phase 1/2) | ✅ |
| T8 | T4, T5, T7 | T8 início Phase 4 | ✅ |
| T9 | T5, T7 | T8→T9 | ✅ |
| T10 | T4, T5, T7 | T9→T10 | ✅ |
| T11 | T7 | T10→T11 | ✅ |
| T12 | T6, T8, T10 | T12 [P] Phase 5 | ✅ |
| T13 | T4, T6, T9, T11 | T13 [P] Phase 5 | ✅ |
| T14 | T11 | T14 [P] Phase 5 | ✅ |
| T15 | T12, T13, T14 | (T12,T13,T14)→T15 | ✅ |
| T16 | T7–T11, T15 | T15→T16 | ✅ |
| T17 | T16 | T16→T17 | ✅ |

> Nota: T8–T11 são sequenciais por causa de `fileParallelism: false` (integration), não por dependência de código — o diagrama de Phase 4 reflete a ordem de execução exigida pelo gate.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Prisma schema | none | none | ✅ |
| T2 | migration | none | none | ✅ |
| T3 | domain types/constants | none (declarações) | none | ✅ |
| T4 | domain pure functions | unit | unit | ✅ |
| T5 | domain schemas | unit | unit | ✅ |
| T6 | shadcn ui | none | none | ✅ |
| T7 | repository | integration | integration | ✅ |
| T8 | action core | integration | integration | ✅ |
| T9 | action core | integration | integration | ✅ |
| T10 | action core | integration | integration | ✅ |
| T11 | action core | integration | integration | ✅ |
| T12 | React client component | none | none | ✅ |
| T13 | React client component | none | none | ✅ |
| T14 | React client component | none | none | ✅ |
| T15 | React client component | none | none | ✅ |
| T16 | index + server page + layout | none | none | ✅ |
| T17 | E2E flow | e2e | e2e | ✅ |

Todos ✅ — nenhuma violação. Componentes React são "none" pela matriz (cobertos por build gate + E2E ponta a ponta), consistente com a feature 3.

## Coverage — requisitos → tasks

CMT-01→T8,T12 · CMT-02→T1,T2,T4,T7 · CMT-03→T4 · CMT-04→T5,T8 · CMT-05→T1,T7,T8 · CMT-06→T6,T8,T12 · CMT-07→T4,T8 · CMT-08→T4,T7,T13,T16 · CMT-09→T13,T16 · CMT-10→T7,T16 · CMT-11→T9,T13 · CMT-12→T7,T9 · CMT-13→T10,T12 · CMT-14→T4,T10 · CMT-15→T4,T7,T10 · CMT-16→T5,T7,T10 · CMT-17→T7,T11,T14 · CMT-18→T17

**18/18 requisitos mapeados a tasks.** ✅
