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

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
