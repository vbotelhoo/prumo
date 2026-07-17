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

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
