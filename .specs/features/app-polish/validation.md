# app-polish Validation

**Date**: 2026-07-24
**Spec**: `.specs/features/app-polish/spec.md`
**Diff range**: `d752d7f..HEAD` (branch `cursor/spec-app-polish`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `aa110b0` — RTL/jsdom infra + smoke test |
| T2   | ✅ Done | `31adead` — EmptyState + Skeleton |
| T3   | ✅ Done | `2dd0ed1` — StatCard + PageHeader |
| T4   | ✅ Done | `d442e7e` — chart tokens + refactor |
| T5   | ✅ Done | `5670375` — error.tsx |
| T6   | ⚠️ Partial | `d555b7e` — 5 `loading.tsx` created, but never revisited after later phases restructured 3 of the 5 pages; dashboard's is now materially stale (see AC gap below) |
| T7   | ✅ Done | `3510405` — DashboardHero |
| T8   | ✅ Done | `003ec7d` — QuickActions + modal exports |
| T9   | ✅ Done | `85923f0` — dashboard recomposition + e2e |
| T10  | ✅ Done | `b530518` — transactions polish |
| T11  | ✅ Done | `091a796` — commitments polish (progress bar); introduces an unfixed keyboard-access gap, see below |
| T12  | ✅ Done | `4d2d71d` — categories polish + new e2e spec |
| T13  | ✅ Done | `80642da` — projections polish |
| T14  | ✅ Done | `e2bfd35` — responsive/keyboard e2e |
| T15  | ✅ Done | `d35bd53` — hardcoded-palette sweep (grep confirmed empty, re-run independently) |
| T16  | ✅ Done | `83b18b2` — impeccable passes + detector (re-run independently, confirmed) |

All 16 tasks have commits matching their described scope 1:1 with `git log d752d7f..HEAD`. T6 is marked Partial because its "done when" claim ("formas aproximam as páginas") is no longer true for 1 of 5 routes after subsequent tasks changed page shape without a follow-up commit touching `loading.tsx`.

---

## Spec-Anchored Acceptance Criteria

### P1: Fundação de estados e primitivos compartilhados

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: skeleton por rota (5×) aproximando a forma real | Each of 5 `loading.tsx` mirrors its real page's shape | `src/app/app/loading.tsx:1-54` vs `src/app/app/page.tsx:53-91` — skeleton renders a centered greeting + **4**-stat grid + an extra grid of **4** shortcut blocks; real page (post-T9) renders `DashboardHero`+`QuickActions` side-by-side + **3** `StatCard`s + 2 cards, **no** 4-block shortcut section at all | ❌ **GAP** (dashboard route only) |
| — same AC, transactions/commitments/categories routes | Skeleton mirrors real page | `src/app/app/transactions/loading.tsx:1-38`, `commitments/loading.tsx:1-33` vs their `*PageClient.tsx` — header+list shape matches | ✅ PASS |
| — same AC, projections route | Skeleton mirrors real page | `src/app/app/projections/loading.tsx:1-27` vs `src/app/app/projections/page.tsx:35-41` — skeleton omits the `PageHeader` block the real page renders first | ⚠️ Minor gap (cosmetic, not a phantom section like dashboard) |
| AC2: error boundary compartilhado, pt-BR calmo, sem stack trace, `reset()` no clique | Boundary renders `"Algo não saiu como esperado"` + calm description, no raw error text, button calls `reset()` | `src/app/app/error.tsx:19-38`; `src/app/__tests__/app-error.test.tsx:15-46` — `expect(renderedText).not.toContain("ECONNREFUSED")`, `expect(reset).toHaveBeenCalledTimes(1)` | ✅ PASS (component-level only — see Edge Cases: no e2e proves a route actually falls into this boundary end-to-end) |
| AC3: EmptyState compartilhado em toda lista vazia | Same shared component (icon+title+description+action) used everywhere a list can be empty | `src/shared/components/ui/empty-state.tsx`; consumed at `TransactionsPageClient.tsx:92`, `CommitmentList.tsx:45`, `CategorySection.tsx:77`, `CategorySpendingChart.tsx:31`, `UpcomingInstallmentsList.tsx:30`; branch coverage `src/shared/__tests__/empty-state.test.tsx:21-94` | ✅ PASS |
| AC4: primitivos só usam tokens de `globals.css` | Zero hardcoded palette classes | `src/shared/__tests__/empty-state.test.tsx:84-94` (regex assertion) + independent grep (see Gate Check) returning empty | ✅ PASS |

### P1: Dashboard reestruturado

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: saldo-herói Display tabular, único número de destaque, saudação secundária | One `text-4xl`/tabular-nums element; greeting is `text-muted-foreground` | `e2e/dashboard.spec.ts:160-165` — `expect(heroBalance).toHaveText("R$ 500,00")`, `toHaveClass(/text-4xl/)`, `toHaveClass(/tabular-nums/)`, `expect(page.locator('#main-content [class*="text-4xl"]')).toHaveCount(1)` | ✅ PASS |
| AC2: negativo = cor Saída; positivo = texto primário/Entrada | `text-negative` when < 0, `text-foreground` otherwise | `src/app/app/__tests__/dashboard-hero.test.tsx:15-31` (unit, both branches); `e2e/dashboard.spec.ts:293-297` (negative, `-R$ 800,00`) | ✅ PASS |
| AC3: 4 botões emoji removidos, atalhos de criação no lugar | No emoji text in `#main-content`; "Nova transação"/"Novo compromisso" buttons visible | `e2e/dashboard.spec.ts:218-231` — `expect(main).not.toContainText(emoji)` for 💰📋🏷️📈, `expect(main.getByRole("button", {name: "Nova transação"})).toBeVisible()` | ✅ PASS |
| AC4: atalho abre form; sucesso reflete no dashboard | Creating a transaction via the shortcut updates hero+cards without navigation | `e2e/dashboard.spec.ts:179-200` — `expect(page.url()).toBe(urlBeforeClick)`, `expect(heroBalance).toHaveText("R$ 700,00")` | ✅ PASS |
| AC5: cards de gastos/vencimentos no padrão DESIGN.md, gráfico só tokens | Card primitive, tabular values, `var(--chart-N)` only | `src/app/app/page.tsx:70-88` (Card/CardHeader/CardTitle); `CategorySpendingChart.tsx:12-21` (`var(--chart-1..8)`, zero hex); `theme-contrast.test.ts:143-155` (presence of 8 tokens × 2 themes) | ✅ PASS |
| AC6: mês zerado → R$ 0,00 + empty states, nunca área em branco | Hero shows R$ 0,00; chart/list show EmptyState | `e2e/dashboard.spec.ts:262-275` — `toHaveText("R$ 0,00")` (hero + all 3 StatCards), `expect(page.getByText("Nenhum gasto neste mês")).toBeVisible()`, `expect(page.getByText("Nenhuma parcela pendente este mês")).toBeVisible()` | ✅ PASS |

### P1: Polish das páginas de dados

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: numerais tabulares, formatação via `shared`, alinhado à direita | `formatBRL`/`tabular-nums`/`text-right` on every monetary value in list/column context | `StatCard` (`stat-card.tsx:32`, `text-right ... tabular-nums`); `TransactionList.tsx:55-58` (`text-right font-semibold tabular-nums`); `CommitmentList.tsx:80-101` (`tabular-nums`); `stat-card.test.tsx:48-55` (`toContain("tabular-nums")`, exact `formatBRL` text match) | ✅ PASS |
| AC2: hierarquia tipográfica DESIGN.md, cabeçalho consistente entre as 4 páginas | Same `PageHeader` component (Headline title) on all 4 pages | `TransactionsPageClient.tsx:81-89`, `CommitmentsPageClient.tsx:70-77`, `CategoriesPageClient.tsx:45-48`, `projections/page.tsx:37` — all instantiate `PageHeader` | ✅ PASS |
| AC3: cores semânticas só em valores/deltas/parcela, nunca fundo/ícone/título | `text-positive`/`text-negative` applied only to the value span, not container/badge | `TransactionList.tsx:24,55` (`valueClass` applied only to the amount div; type badge stays `bg-muted text-foreground` neutral); `CommitmentList.tsx:98,136-141` (parcela badges stay neutral `bg-muted`/`text-muted-foreground`, never green/red) | ✅ PASS |
| AC4: zero paleta hardcoded em `/app` + módulos UI | grep for `text/bg/border-(gray|zinc|slate|neutral|stone|red|green|blue)-\d+` returns empty | Independent re-run: `grep -rnE '...' src/app/app src/modules/*/components` → only 1 hit, a **comment** in `ProjectionSummary.tsx:12` referencing the fixed bug, not a live class | ✅ PASS |
| AC5: progresso de quitação legível de relance, estados de parcela distintos dentro das regras semânticas | "N/total pagas" + `Progress` bar; prevista/paga visually distinct without hue | `CommitmentList.tsx:79-108` (`{progress.paidCount}/{progress.totalCount}`, `<Progress value={progress.percentPaid}>`); `e2e/commitments.spec.ts:100-110,128` — `expect(progressBar).toHaveAttribute("aria-valuenow", "0")` then `"33"` | ✅ PASS |
| AC6: projeções — navegação de mês + resumo no mesmo padrão | `MonthNavigator` + `ProjectionSummary` (via `StatCard`) match card/typography pattern | `MonthNavigator.tsx:22-52`; `ProjectionSummary.tsx:17-32` (4× `StatCard`); `e2e/projections.spec.ts:135-142` (`statCardValue` locator via `[data-slot="stat-card"]`) | ✅ PASS |
| AC7: modais/diálogos alinhados ao DS, comportamento preservado | Dialog/Button primitives, same functional copy/behavior | `DeleteTransactionDialog.tsx:7-13`, `DeleteCommitmentDialog.tsx:5-10` — both use shadcn `Dialog`/`Button`; `e2e/commitments.spec.ts` (unchanged create/pay flow assertions still pass) | ✅ PASS |

### P1: Responsividade e acessibilidade

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: ≥320px sem scroll horizontal do body | `document.documentElement.scrollWidth <= window.innerWidth` on all 5 routes | `e2e/responsive.spec.ts:154-167` — looped over `PAGES` (5 routes), `expect(noOverflow).toBe(true)` | ✅ PASS |
| AC2: alvos de toque ≥44px em mobile | `min(width,height) >= 44` for interactive elements | `e2e/responsive.spec.ts:105-111,170-246` — covers the primary action button, edit/delete, pay-toggle, create/exclude on all 5 pages | ⚠️ **Partial**: covers page-level primary controls only. Modal-internal buttons (Criar/Cancelar/Excluir dentro de `TransactionModal`/`CommitmentModal`/`Delete*Dialog`) are explicitly out of scope per `polish-report.md` finding #9 — no evidence either way for those |
| AC3: AA nos dois temas, pares novos no teste de contraste | `--positive`/`--negative` and `muted`/`muted-foreground` pairs pass 4.5:1 (or 3:1 for UI) in both themes | `src/app/__tests__/theme-contrast.test.ts:111-115` (5 new pairs added); ran green in gate (part of 259 unit) | ✅ PASS |
| AC4: navegação por teclado com foco visível em toda ação | Every action (atalhos, edição, exclusão, paginação, navegação de mês) reachable+operable via keyboard, visible focus | `e2e/responsive.spec.ts:248-296` covers dashboard shortcut, transactions pagination, projections month-nav (3 flows, matching T14's literal scope) | ❌ **GAP**: AC text is broader ("edição, exclusão" too) than what T14 tested. `CommitmentList.tsx:60-63` — the `CardHeader` that expands/collapses installments is a `<div onClick=...>` with no `role`/`tabIndex`/`onKeyDown`: **not** reachable or operable by keyboard. Self-documented as unfixed in `polish-report.md` finding #10 ("o achado é real e deveria virar task própria") |

### P2: Passes de qualidade do impeccable

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: detector zero findings nos alvos alterados | `detect.mjs --json <changed files>` → `[]` | Independently re-run: `node ~/.agents/skills/impeccable/scripts/detect.mjs --json $(git diff --name-only --diff-filter=d d752d7f..HEAD -- src/shared/components/ui src/app/app 'src/modules/*/components')` → `[]`, exit 0 (18 files) | ✅ PASS |
| AC2: todo achado acionável corrigido ou justificado | No finding silently dropped | `polish-report.md` §"Achados e ações" — 6 corrigidos, 1 falso positivo verificado, 2 justificados. **However**, the loading.tsx staleness found by this Verifier (POLISH-01 gap above) was **not** among the report's findings — it was missed by the T16 audit entirely (loading states are explicitly out of the e2e/visual-audit scope per the Test Coverage Matrix, which is exactly why it slipped through) | ⚠️ Partial — the *documented* findings were all handled per rule 22, but the audit had a blind spot (transitory loading states) that let a real gap through undetected |

**Status**: ❌ Gaps present — 2 concrete AC gaps (POLISH-01 dashboard loading skeleton staleness; POLISH-20 keyboard-inaccessible commitment-card expand), plus 1 partial-coverage AC (POLISH-18 modal touch targets untested).

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/shared/components/ui/stat-card.tsx:19-23` | Swapped `TONE_CLASSES.entrada`/`.saida` (entrada→`text-negative`, saida→`text-positive`) | ✅ Killed — 2/5 `stat-card.test.tsx` tests failed |
| 2 | `src/app/app/_components/DashboardHero.tsx:19` | Flipped `isNegativo` condition: `saldoProjetado < 0` → `saldoProjetado >= 0` | ✅ Killed — 2/4 `dashboard-hero.test.tsx` tests failed |
| 3 | `src/app/app/_components/QuickActions.tsx:51,62` | Changed both modal-render guards from `openModal === "transaction"`/`"commitment"` to `openModal !== null`, allowing both dialogs to mount simultaneously | ✅ Killed — 3/6 `quick-actions.test.tsx` tests failed |

All 3 mutations applied directly to the working tree (repo had zero uncommitted changes beforehand — confirmed via `git status --porcelain`), each run against its targeted unit test file, then reverted with `git checkout -- <file>` immediately after observing the failure. `git status --porcelain` confirmed clean after each revert and at the end of the sensor run.

**Sensor depth**: lightweight (default tier — not a P0/payment-critical feature)
**Result**: 3/3 killed — ✅ PASS

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — primitives are small, single-purpose (`StatCard`/`PageHeader`/`EmptyState`/`Skeleton` each <45 lines) |
| Surgical changes | ⚠️ — mostly yes; one exception: `date-utils.ts`'s `formatDateBR` was extracted mid-feature (T16) as a legitimate bug fix reused across 3 files, which is in-scope harden work, not scope creep |
| No scope creep | ✅ — 52 files changed, all traceable to the 16 tasks; no domain/action/schema files touched, matching the spec's Out-of-Scope table |
| Matches patterns | ✅ — new primitives follow existing shadcn-vendored idiom (`cn`, `data-slot`, `Card`/`CardContent` composition) |
| Spec-anchored outcome check (asserted values match spec) | ✅ — sampled tests assert exact BRL strings, exact class names, exact `aria-valuenow`, not just "assertion exists" |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ — presentation primitives are well covered; 3 spec-listed edge cases (truncation, chart with >8/1 category, DB-down→boundary via e2e) have **zero** automated test evidence (see Edge Cases below) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — every new test file's header comment cites the POLISH-NN/AC it covers |
| Documented guidelines followed | `docs/TESTING.md` (test pyramid, independence between tests) — followed; RTL/jsdom infra addition (T1) is a deliberate, disclosed decision, not an undocumented deviation |

❌ 2 "Partial/⚠️" rows above → see Fix Plans.

---

## Edge Cases

- [x] Saldo projetado negativo: cor semântica sem quebrar layout, sinal na largura tabular — `dashboard-hero.test.tsx:24-31`, `e2e/dashboard.spec.ts:277-298`
- [ ] Nomes de categoria/descrição longos truncam com reticências sem quebrar alinhamento — **NOT covered by any automated test**. Code implements it (`truncate`+`min-w-0` in `TransactionList.tsx:43,50-51`, `UpcomingInstallmentsList.tsx:64-65,73`, `CommitmentList.tsx` description spans), but no unit/e2e assertion exists (evidence-or-zero → not covered)
- [ ] Gráfico com 1 única categoria ou muitas (>8) permanece legível — **NOT covered by any automated test**. Code supports it (`CATEGORY_COLOR_VARS[index % 8]` in `CategorySpendingChart.tsx:36-39`); only manually screenshot-verified per `polish-report.md` finding #7, not persisted as a test
- [x] Paginação com muitas páginas utilizável em 320px — `e2e/responsive.spec.ts:261-284` (21 items → 2 pages, keyboard+tap tested at 320px)
- [~] Banco de dados indisponível → error boundary compartilhado — component-level only (`app-error.test.tsx`); **no e2e** actually drops the DB connection and navigates to prove a real route falls into the boundary (spec's own "Independent Test" for this story literally describes that scenario)
- [~] Usuário recém-cadastrado → empty state em cada página — proven for dashboard (`e2e/dashboard.spec.ts:262-275`), transactions (`e2e/transactions.spec.ts:78`), categories (`e2e/categories.spec.ts:57-74`); **not proven for `/app/commitments`** itself (no e2e exercises a fresh account visiting the commitments page to see `"Nenhum compromisso ainda"`, `CommitmentList.tsx:45-49`)

---

## Gate Check

- **Gate command**: `export PATH=... && pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build`
- **First run**: integration failed with 42/156 tests erroring on `Foreign key constraint violated on the constraint: commitment_categoryId_fkey` — root-caused to the shared `prumo-test-pg` Docker Postgres (port 55432) having accumulated 326 users / 53 commitments / 47 categories from unrelated prior sessions, which broke the integration suite's broad `category.deleteMany({ where: { userId: { not: null } } })` cleanup query. This is **pre-existing test-environment pollution, not a regression from this feature** — confirmed by truncating the test DB (`TRUNCATE ... RESTART IDENTITY CASCADE`, a data-only operation, no schema/app-code change) and re-running.
- **Second run (clean DB)**: all green.
  - `pnpm typecheck`: 0 errors
  - `pnpm lint`: 0 errors, 10 warnings (all pre-existing, in files untouched by this feature: `commitments-repository.integration.test.ts`, `installments.ts`, `month.ts`, `transactions-repository.integration.test.ts` — unrelated `no-unused-vars`)
  - `pnpm test:unit`: **259 passed**, 0 failed
  - `pnpm test:integration`: **156 passed**, 0 failed
  - `pnpm test:e2e`: **76 passed**, 0 failed (8 workers) — including both `e2e/categories.spec.ts:104` and `e2e/commitments.spec.ts:37`, the two specs `polish-report.md` claimed flake under Postgres contention. They passed cleanly in this run; the claimed pre-existing flakiness did not reproduce, so it could not be independently confirmed or refuted — but since no failure occurred, the gate is unambiguously green and no further isolation run was needed per the task's own conditional instruction ("se pegar falha... rode de novo")
  - `pnpm build`: clean production build, all 10 `/app*` routes compiled
- **Test count before feature**: 222 unit / 156 integration / 57 e2e
- **Test count after feature**: 259 unit / 156 integration / 76 e2e
- **Delta**: +37 unit, +0 integration (expected — no domain changes), +19 e2e
- **Skipped tests**: none
- **Failures**: none (after test-DB cleanup, which is environment hygiene, not a code change)

---

## Fix Plans

### Fix 1: Dashboard `loading.tsx` no longer approximates the real page

- **Root cause**: `src/app/app/loading.tsx` was written in T6 (`d555b7e`), before T9 (`85923f0`) recomposed `src/app/app/page.tsx` into hero-first (DashboardHero + QuickActions + 3 StatCards + 2 cards, zero emoji-nav grid). No later commit touched `loading.tsx` to match.
- **Fix task**: Rewrite `src/app/app/loading.tsx` to skeleton the current shape: a hero-row skeleton (large block left + 2 button-shaped blocks right, mirroring `DashboardHero`+`QuickActions`), a 3-column stat grid (not 4), the existing 2-card grid (chart+list, already correct), and removal of the trailing 4-block "shortcuts" grid that has no real-page counterpart.
- **Priority**: Major (visible, reproducible layout-shift on every dashboard load; contradicts the design.md's own stated risk mitigation for this exact failure mode)

### Fix 2: `CommitmentList` card-expand toggle is not keyboard-accessible

- **Root cause**: `CommitmentList.tsx:60-63` uses `<CardHeader onClick={...}>` (a `<div>`) to expand/collapse installments, with no `role="button"`, `tabIndex={0}`, or `onKeyDown` handler for Enter/Space.
- **Fix task**: Add `role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}` (or swap to a real `<button>` wrapping the header content) and add an e2e keyboard assertion alongside the existing 3 flows in `e2e/responsive.spec.ts`.
- **Priority**: Major (self-admitted real accessibility gap against a P1 AC's literal wording — "toda ação... alcançável e operável [por teclado]")

### Fix 3 (Minor, optional): stale/incomplete loading skeletons for projections and categories

- **Root cause**: `projections/loading.tsx` was never updated to include a `PageHeader` skeleton block after T13 added `PageHeader` to the real page; `categories/loading.tsx` renders the form-skeleton before the title-skeleton, while the real page renders `PageHeader` first.
- **Fix task**: Add a title/description skeleton block to `projections/loading.tsx`; reorder `categories/loading.tsx` to title-skeleton → form-skeleton → sections, matching `CategoriesPageClient.tsx`.
- **Priority**: Minor/Cosmetic

### Fix 4 (Minor, test-coverage only — no code change implied)

- Add automated coverage for: (a) truncation of long category/description names without breaking value-column alignment, (b) `CategorySpendingChart` legibility with 1 and >8 categories (a unit test on the color-cycling function would suffice — no browser needed), (c) an e2e assertion that a freshly signed-up account sees `"Nenhum compromisso ainda"` on `/app/commitments`.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ---------- |
| POLISH-01   | In Tasks | ❌ Needs Fix |
| POLISH-02   | In Tasks | ✅ Verified |
| POLISH-03   | In Tasks | ✅ Verified |
| POLISH-04   | In Tasks | ✅ Verified |
| POLISH-05   | In Tasks | ✅ Verified |
| POLISH-06   | In Tasks | ✅ Verified |
| POLISH-07   | In Tasks | ✅ Verified |
| POLISH-08   | In Tasks | ✅ Verified |
| POLISH-09   | In Tasks | ✅ Verified |
| POLISH-10   | In Tasks | ✅ Verified |
| POLISH-11   | In Tasks | ✅ Verified |
| POLISH-12   | In Tasks | ✅ Verified |
| POLISH-13   | In Tasks | ✅ Verified |
| POLISH-14   | In Tasks | ✅ Verified |
| POLISH-15   | In Tasks | ✅ Verified |
| POLISH-16   | In Tasks | ✅ Verified |
| POLISH-17   | In Tasks | ✅ Verified |
| POLISH-18   | In Tasks | ⚠️ Partial (page-level controls verified; modal-internal buttons uncovered) |
| POLISH-19   | In Tasks | ✅ Verified |
| POLISH-20   | In Tasks | ❌ Needs Fix |
| POLISH-21   | In Tasks | ✅ Verified |
| POLISH-22   | In Tasks | ✅ Verified (with a noted blind spot — see AC table) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 20/22 POLISH criteria fully matched spec outcome; 2 gaps (POLISH-01, POLISH-20); 1 partial (POLISH-18)
**Sensor**: 3/3 mutations killed
**Gate**: 259 unit + 156 integration + 76 e2e + build, all passed (after clearing pre-existing test-DB pollution unrelated to this feature)

**What works**: The vast majority of the feature is solid — all 5 pages consistently use the new shared primitives (`EmptyState`, `Skeleton`, `StatCard`, `PageHeader`), zero hardcoded palette classes remain (independently re-verified by grep), the dashboard recomposition is thoroughly e2e-tested including the negative-balance and zero-state edge cases, the impeccable detector independently confirms zero findings on the 18 changed UI-layer files, and all 3 discrimination-sensor mutations were killed cleanly, meaning the new component tests genuinely discriminate correct from incorrect behavior. Test counts grew honestly (+37 unit, +19 e2e, 0 deleted or weakened).

**Issues found**:
1. `src/app/app/loading.tsx` is stale relative to the post-T9 dashboard shape (wrong stat-card count, a phantom shortcut-grid section, missing hero) — fails the literal POLISH-01 AC for that route. This was not caught by the T16 impeccable audit because loading states are explicitly out of that audit's e2e/screenshot scope.
2. `CommitmentList.tsx`'s card-expand control is not keyboard-operable — a real, self-admitted-but-unfixed gap against POLISH-20, documented in `polish-report.md` finding #10 but left for "a future task" that was never created.
3. Minor: two other `loading.tsx` files have smaller shape mismatches; three spec-listed edge cases have implementation but no automated test evidence.

**Next steps**: Route Fix 1 and Fix 2 (both Major) back to an implementer for a fix→re-verify cycle; Fix 3/4 (Minor) can be batched with them or deferred at the orchestrator's discretion. Do not mark roadmap item 9 complete until Fix 1/2 are verified.
