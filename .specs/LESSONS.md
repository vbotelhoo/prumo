# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — When 'validate env at startup' is implemented as an exported function, verify at least one real boot path (db client, auth instance) actually calls it before marking the task done — a passing unit test of the function alone does not prove the AC; empirically try starting/building the app without the required env vars.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `env-validation,startup-checks` · harmful: 0
- features: setup
- evidence: spec.md story Persistência AC-4 / src/shared/env.ts:25-36 (env-validation,startup-checks)
- last seen: 2026-07-16T16:05:09Z

### L-002 — Next.js instrumentation.ts register() throwing on invalid env does not abort the process (Next.js catches it internally, only logs 'Failed to prepare server'); the observable effect is every route responding 500 with the cause in logs, not a dead process — verify what 'fail on boot' means empirically (HTTP response, not just log or exit code) before accepting an AC about startup failure as satisfied.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `env-validation,startup-checks,nextjs-instrumentation` · harmful: 0
- features: setup
- evidence: src/instrumentation.ts:12-20 SPEC_DEVIATION (env-validation,startup-checks,nextjs-instrumentation)
- last seen: 2026-07-16T16:56:15Z

### L-003 — When E2E tests target a persistent (non-ephemeral) test database, generate unique deterministic values (CPF, email, etc.) from the full entropy of the random seed, not just its last digit or a narrow modulo band — low-cardinality generators collide against accumulated rows across repeated local/CI runs.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: auth
- evidence: e2e/auth.spec.ts:11-32 — first pnpm test:e2e run failed with P2002 unique constraint on cpf (e2e)
- last seen: 2026-07-17T00:33:31Z

### L-004 — When a spec AC describes behavior that is entirely delegated to a third-party library's default configuration (e.g. session TTL), flag it explicitly as 'delegated, not independently tested' in the design/tasks test matrix rather than silently marking it none/build-gate-only, so the Verifier does not have to infer the gap.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: auth
- evidence: spec.md AC-login.4 (session persists 7d, Better Auth default) — no test exercises the expiry boundary (auth)
- last seen: 2026-07-17T00:33:37Z

### L-005 — When a spec AC asserts a UI affordance remains available/editable after an automated action (not just that the action itself succeeds), add a direct test interacting with the field post-action rather than relying on code inspection of the absence of disabled/readOnly attributes.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: auth
- evidence: spec.md AC-CEP.3 (fields remain editable after CEP auto-fill) — no test asserts post-fill editability, only code inspection (auth)
- last seen: 2026-07-17T00:33:42Z

### L-006 — Playwright's getByText() does not accept a selector option; scope ambiguous text matches with getByRole() instead.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: categories-transactions
- evidence: validation.md#Post-Verification-Update (row 1) (e2e)
- last seen: 2026-07-19T14:52:18Z

### L-007 — When integration/E2E tests assume seeded reference data, the CI workflow must run the seed step after migrations, not just prisma migrate deploy; declare every CLI tool a seed script shells out to (e.g. tsx) as an explicit dependency.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `ci` · harmful: 0
- features: categories-transactions
- evidence: validation.md#Post-Verification-Update (row 2) (ci)
- last seen: 2026-07-19T14:52:18Z

### L-008 — Integration tests that sign up users through a real auth core function must use checksum-valid fixture data (e.g. real CPF/CNPJ check digits) and must build request headers from the session cookie the signup call returns, not an empty Headers() — otherwise every session-dependent action under test silently resolves to unauthorized.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `integration-tests` · harmful: 0
- features: categories-transactions
- evidence: validation.md#Post-Verification-Update (row 3) (integration-tests)
- last seen: 2026-07-19T14:52:32Z

### L-009 — Client components that call a server action to mutate data must call router.refresh() (or otherwise revalidate) in their success handler, or the server-rendered list will keep showing stale data until a manual reload; integration tests that call *-core action functions directly cannot catch this, only a real E2E test that drives the UI can.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `client-components` · harmful: 0
- features: categories-transactions
- evidence: validation.md#Post-Verification-Update (row 4) (client-components)
- last seen: 2026-07-19T14:52:32Z

### L-010 — When a task's Done-when criteria include an error/failure path (e.g. an action returning ok:false), add an explicit test for that path instead of assuming a later E2E task will cover it implicitly.
- signal: `ac_gap` · recurrence: 1 feature(s) · harmful: 0
- features: dashboard
- evidence: DASH-14
- last seen: 2026-07-23T00:45:39Z

### L-011 — When a new feature composes around a component whose edge-case behavior (e.g. negative values) was only tested by a prior feature, add at least one test in the new feature that exercises that edge case in the new composition.
- signal: `ac_gap` · recurrence: 1 feature(s) · harmful: 0
- features: dashboard
- evidence: DASH-03
- last seen: 2026-07-23T00:45:39Z

### L-012 — Assert every field-level outcome named in a WHEN X THEN Y spec criterion individually, not just a single matching occurrence of a value that can appear multiple times on the page.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · harmful: 0
- features: dashboard
- evidence: DASH-02
- last seen: 2026-07-23T00:45:59Z

### L-013 — Add an explicit test proving items with a zero measure are excluded from an aggregate result, even when the omission is a natural side effect of a WHERE-filtered query.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · harmful: 0
- features: dashboard
- evidence: DASH-05
- last seen: 2026-07-23T00:45:59Z

### L-014 — When a spec AC lists multiple fields a UI row must display, assert each field's rendered text, not just one identifying field as a stand-in for the rest.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · harmful: 0
- features: dashboard
- evidence: DASH-11
- last seen: 2026-07-23T00:45:59Z

### L-015 — When a spec edge case says a rule applies at two call sites, write a test for both call sites; passing one is not evidence for the other.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · harmful: 0
- features: dashboard
- evidence: DASH-17
- last seen: 2026-07-23T00:45:59Z

### L-016 — For a11y ACs requiring keyboard reachability and a visible focus indicator across a set of interactive items, assert Tab order and focus state on each item in e2e, not just that the containing landmark is visible and labeled.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `a11y` · harmful: 0
- features: app-shell
- evidence: SHELL-15 (a11y)
- last seen: 2026-07-24T00:22:44Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
