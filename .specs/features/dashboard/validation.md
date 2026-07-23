# Dashboard Validation

**Date**: 2026-07-22 (iteration 2 — fix→re-verify)
**Spec**: `.specs/features/dashboard/spec.md`
**Diff range**: `82bcbb2..9ac4911`
**Verifier**: independent sub-agent (author ≠ verifier)

**Iteration history**:
- Iteration 1 (`82bcbb2..20f2f96`): ⚠️ Issues — 2 ACs with zero test evidence (DASH-03, DASH-14), 4 spec-precision gaps (DASH-02, DASH-05, DASH-11, DASH-17). Build gate and sensor were clean.
- Iteration 2 (this report, `82bcbb2..9ac4911`): implementer added 2 test-only commits (`a056b10`, `9ac4911`) targeting exactly those 6 gaps. Re-verified independently below.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `getMonthlyExpensesByCategory` + exports + integration tests (now incl. DASH-05 omission test) |
| T2   | ✅ Done | `getMonthlyInstallmentsByCategory` + `listUnpaidInstallmentsForMonth` + exports + integration tests (now incl. DASH-05 and DASH-17 tests) |
| T3   | ✅ Done | `mergeCategorySpending` pure fn + unit tests |
| T4   | ✅ Done | `recharts@^3.10.0` + `CategorySpendingChart` |
| T5   | ✅ Done | `UpcomingInstallmentsList` — error path (DASH-14) now has a real, non-mocked E2E repro |
| T6   | ✅ Done | `src/app/app/page.tsx` composition + `e2e/dashboard.spec.ts` (11 tests, up from 7) + ROADMAP.md updated |

**Fix commits reviewed** (both test-only — confirmed via `git diff 20f2f96..9ac4911 --stat`, zero lines touched outside `e2e/`, `src/modules/transactions/__tests__/`, `src/modules/commitments/__tests__/`):
- `a056b10` — DASH-05 (both modules) + DASH-17 (`listUnpaidInstallmentsForMonth` side)
- `9ac4911` — DASH-02 (strengthened), DASH-03 (new), DASH-11 (strengthened), DASH-14 (new)

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DASH-01 | Entradas/saídas/saldo do mês corrente, idênticos a `/app/projections` | `e2e/dashboard.spec.ts:90-123` — `expect(saldoText).toContainText("500")` | ✅ PASS (unchanged from iter. 1) |
| DASH-02: mês vazio → entradas/saídas/saldo = 0 | Os 3 valores exibidos como zero, individualmente | `e2e/dashboard.spec.ts:159-171` — `expect(entradasText).toContainText("R$ 0,00")`, `expect(saidasText).toContainText("R$ 0,00")`, `expect(saldoText).toContainText("R$ 0,00")` — each located via its own label (`Entradas Previstas`/`Saídas Previstas`/`Saldo Projetado`) | ✅ PASS — gap closed. Now asserts each of the 3 values individually instead of one generic "R$ 0,00" occurrence. |
| DASH-03: saldo negativo exibido em BRL, sem ocultar/truncar | Valor negativo, formatado, completo | `e2e/dashboard.spec.ts:176-198` — saída de R$800 sem entrada no mês; `expect(saldoText?.startsWith("-")).toBe(true)` + `expect(saldoText).toContain("800,00")` | ✅ PASS — gap closed. Real negative-saldo scenario created and asserted precisely (sign + full value, not truncated). |
| DASH-04 | Gráfico soma saída+parcela por `categoryId` | `merge-category-spending.test.ts:34-43`; `e2e/dashboard.spec.ts:125-152` | ✅ PASS (unchanged) |
| DASH-05: categoria sem gasto omitida do gráfico | Categoria ausente do array retornado | `transactions-repository.integration.test.ts:769-793` — cria 2 categorias padrão, gasto só numa; `expect(result.some(s => s.categoryId === categoryWithoutSpend.id)).toBe(false)`; `commitments-repository.integration.test.ts:480-497` — parcela num mês diferente; `expect(result.some(s => s.categoryId === testCategoryId)).toBe(false)` | ✅ PASS — gap closed. Both modules now assert a specific category's exclusion by id, not just "empty array". (Note: the commitments-side test proves exclusion via a different-month installment rather than a second same-month category with spend — a slightly less rigorous scenario than the transactions-side test, but it directly asserts the omission claim on a real `categoryId`, which is the outcome DASH-05 requires.) |
| DASH-06 | Estado vazio no gráfico | `CategorySpendingChart.tsx:26-32`; `e2e/dashboard.spec.ts:172-174` | ✅ PASS (unchanged) |
| DASH-07 | Soma avulsa+parcela numa única fatia | `merge-category-spending.test.ts:34-43`; `e2e/dashboard.spec.ts:125-152` | ✅ PASS (unchanged) |
| DASH-08 | Lista ordenada por `dueDate` asc | `commitments-repository.integration.test.ts:640-664` | ✅ PASS (unchanged) |
| DASH-09 | Parcela `paga` excluída | `commitments-repository.integration.test.ts:612-638`; `e2e/dashboard.spec.ts:203-241` | ✅ PASS (unchanged) |
| DASH-10 | Estado vazio na lista | `UpcomingInstallmentsList.tsx:27-33`; `e2e/dashboard.spec.ts:175` | ✅ PASS (unchanged) |
| DASH-11: item mostra descrição, categoria, valor, vencimento | Todos os 4 campos exibidos na UI | `e2e/dashboard.spec.ts:234-239` — scoped to the row (`page.locator("li", {hasText:"Conta a pagar"})`): `expect(row.getByText("Alimentação")).toBeVisible()`, `expect(row.getByText("R$ 75,00")).toBeVisible()`, `expect(row.getByText(today)).toBeVisible()`, plus the pre-existing description assertion | ✅ PASS — gap closed. All 4 fields now asserted in the rendered UI, not just description. |
| DASH-12 | Action chamada com `{installmentId, status:"paga"}` | `UpcomingInstallmentsList.tsx:43` (source-verified) | ✅ PASS (unchanged) |
| DASH-13 | Sucesso remove item sem reload | `e2e/dashboard.spec.ts:266-274` | ✅ PASS (unchanged) |
| DASH-14: falha na action mantém item e mostra erro | Item permanece, mensagem de erro exibida | `e2e/dashboard.spec.ts:288-330` — real (non-mocked) failure: commitment deleted server-side from a second browser context sharing session cookies, cascading-deletes its installment; the first context's stale rendered `installmentId` is then submitted via "Marcar como paga"; `expect(page.getByText("Parcela que vai sumir")).toBeVisible()` (item retained) + `expect(page.getByText("Parcela não encontrada")).toBeVisible()` (exact `INSTALLMENT_NOT_FOUND_ERROR` string, confirmed at `src/modules/commitments/domain/constants.ts:3`) | ✅ PASS — gap closed. Genuine server-side failure, not a mock; exercises the real error branch in `UpcomingInstallmentsList.tsx:44-48,64-68`. |
| DASH-15 | Parcela paga continua contando no saldo/gráfico | `e2e/dashboard.spec.ts:280-283` | ✅ PASS (unchanged) |
| DASH-16 | Dashboard vazio nunca 500 | `e2e/dashboard.spec.ts:154-175` | ✅ PASS (unchanged) |
| DASH-17: `fixed_payment` tratado igual no gráfico e na lista | Mesma soma/inclusão independente do `mode`, nos dois pontos citados pela spec | Gráfico: `commitments-repository.integration.test.ts:502-519` (pre-existing); Lista: `commitments-repository.integration.test.ts:630-654` — new `fixed_payment` commitment, `listUnpaidInstallmentsForMonth` returns it with correct fields | ✅ PASS — gap closed. Both call sites named by the spec's edge case now have direct evidence. |
| DASH-18 | Agrupamento por `categoryId`, não por nome | `merge-category-spending.test.ts:45-61` | ✅ PASS (unchanged) |

**Status**: ✅ All 18 ACs covered with spec-anchored evidence — no remaining gaps, no remaining spec-precision gaps.

---

## Discrimination Sensor

Not re-run in full for this iteration, per the coordinator's guidance — the 2 new commits are test-only (confirmed via `git diff 20f2f96..9ac4911 --stat`: only `e2e/dashboard.spec.ts` and the two `__tests__/*.integration.test.ts` files changed, zero lines in `src/modules/*/data/`, `src/app/app/_lib/`, `src/app/app/_components/`, or `src/app/app/page.tsx`). The 3 mutations from iteration 1 (categoryId-vs-name grouping, `prevista`-only filter, paga-still-counts rule) target source files untouched by this iteration and remain valid:

| Mutation (iteration 1, still valid) | File:line | Result |
| --- | --- | --- |
| 1 | `src/app/app/_lib/merge-category-spending.ts:22-23` | ✅ Killed |
| 2 | `src/modules/commitments/data/commitments-repository.ts:472` | ✅ Killed |
| 3 | `src/modules/commitments/data/commitments-repository.ts:411-417` | ✅ Killed |

**Sensor depth**: lightweight (default tier)
**Result**: 3/3 killed — PASS ✅ (carried forward, source unchanged since iteration 1)

New DASH-14 test was inspected for realism instead of re-sensored: it forces a genuine server-side failure (cross-context commitment deletion cascades to delete the installment via `onDelete: Cascade` on `Installment.commitmentId`, `prisma/schema.prisma:177`) rather than mocking `setInstallmentStatusAction`, so it is inherently discriminating — it cannot pass without the real error branch (`UpcomingInstallmentsList.tsx:44-48`) executing.

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅ — fix commits added only the tests needed to close the 6 named gaps, nothing else |
| Surgical changes | ✅ — 3 files touched, all test files, no source changes |
| No scope creep   | ✅ — no `// SPEC_DEVIATION` markers; every new test traces to a named DASH-NN gap from iteration 1 |
| Matches patterns | ✅ — new tests follow existing conventions (`expect.arrayContaining`/`.some()` for omission checks, row-scoped locators for UI field checks, cross-context cookie sharing already used for AD-012 test) |
| Spec-anchored outcome check (asserted values match spec) | ✅ — all 18 ACs now target precise spec-defined outcomes |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — error path now covered |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md` (gate order), `docs/TESTING.md` (test pyramid) | ✅ |
| No mocking used to fake DASH-14 — genuine server-side failure | ✅ — verified by reading the cascade-delete schema config and the exact error string, not taken on faith |

---

## Edge Cases

- [x] No transactions/commitments/categories → dashboard renders zeroed/empty, never 500
- [x] `fixed_payment` treated like `installment_payment` — now tested at both call sites (gráfico + lista)
- [x] Two categories with same name, different `categoryId` → separate slices
- [x] Same category across multiple transactions/installments → summed, not one slice per entry
- [x] Category with zero spend in the month → omitted from both aggregate functions (newly closed)
- [x] Mark-as-paid failure (stale/deleted installment) → item retained, inline error shown (newly closed)

---

## Gate Check

- **Gate command**: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build`
- **Result**: All stages passed, 0 failed — independently re-run, not taken from the coordinator's report
  - `pnpm lint` → 0 errors, 10 pre-existing-style warnings (unchanged from iteration 1, none new)
  - `pnpm typecheck` → clean
  - `pnpm test:unit` → **149 passed** (149/149)
  - `pnpm test:integration` → **156 passed** (156/156) — cleaned the shared test DB with the documented `AGENTS.md` workaround before this run
  - `pnpm test:e2e` → **22 passed** (22/22), including both new DASH-03 and DASH-14 tests
  - `pnpm build` → succeeds
  - Re-cleaned the DB and re-ran `pnpm test:integration` after `test:e2e` (which dirties it again) → confirmed 156/156 on a clean DB for the final trustworthy number
- **Test count before feature**: 143 unit / 139 integration (pre-`dashboard`, per `.specs/STATE.md`)
- **Test count after feature (iteration 1)**: 149 unit / 153 integration / 20 e2e
- **Test count after feature (iteration 2, this report)**: 149 unit / 156 integration / 22 e2e
- **Delta from iteration 1**: +0 unit, +3 integration (DASH-05 ×2, DASH-17 ×1), +2 e2e (DASH-03, DASH-14) — plus 2 existing E2E tests strengthened in place (DASH-02, DASH-11) without changing test count
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None outstanding. All 6 gaps from iteration 1 (DASH-02, DASH-03, DASH-05, DASH-11, DASH-14, DASH-17) are closed with spec-anchored, non-shallow evidence.

---

## Requirement Traceability Update

| Requirement | Previous Status (iter. 1) | New Status (iter. 2) |
| ----------- | -------------------------- | --------------------- |
| DASH-01 | ✅ Verified | ✅ Verified |
| DASH-02 | ⚠️ Verified — spec-precision gap | ✅ Verified |
| DASH-03 | ❌ Needs Fix | ✅ Verified |
| DASH-04 | ✅ Verified | ✅ Verified |
| DASH-05 | ⚠️ Verified — spec-precision gap | ✅ Verified |
| DASH-06 | ✅ Verified | ✅ Verified |
| DASH-07 | ✅ Verified | ✅ Verified |
| DASH-08 | ✅ Verified | ✅ Verified |
| DASH-09 | ✅ Verified | ✅ Verified |
| DASH-10 | ✅ Verified | ✅ Verified |
| DASH-11 | ⚠️ Verified — spec-precision gap | ✅ Verified |
| DASH-12 | ✅ Verified | ✅ Verified |
| DASH-13 | ✅ Verified | ✅ Verified |
| DASH-14 | ❌ Needs Fix | ✅ Verified |
| DASH-15 | ✅ Verified | ✅ Verified |
| DASH-16 | ✅ Verified | ✅ Verified |
| DASH-17 | ⚠️ Verified — spec-precision gap | ✅ Verified |
| DASH-18 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/18 ACs matched spec outcome, 0 spec-precision gaps, 0 uncovered
**Sensor**: 3/3 mutations killed (carried forward, unaffected by test-only fix commits); DASH-14's new test independently confirmed non-mocked/genuinely discriminating by source inspection
**Gate**: 149 unit + 156 integration + 22 e2e + lint + typecheck + build — all passed, independently re-run, numbers match the coordinator's report exactly

**What works**: All 18 DASH requirements now have direct, spec-anchored test evidence. The two fix commits were surgical (test-only, 3 files, no source touched) and closed every gap named in iteration 1 without weakening or duplicating existing coverage. The DASH-14 fix is notable for avoiding mocks — it forces a real server-side `INSTALLMENT_NOT_FOUND_ERROR` via cross-context cascade deletion, which is a stronger test than a mocked action would have been.

**Issues found**: None remaining.

**Next steps**: None — feature is verified. No new lessons recorded for this iteration (the fixes are genuine closures of iteration 1's grounded signal, not new shallow patches — per `lessons.md`, fixes that adequately close a prior gap don't generate new lessons).
