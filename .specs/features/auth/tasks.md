# Auth Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/auth/design.md`
**Status**: Draft — awaiting approval

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `docs/TESTING.md`, `README.md` (seção testes), AD-011, `.specs/features/auth/design.md` (componente 9); amostras: `src/shared/__tests__/money.test.ts`, `env.test.ts`, `db.integration.test.ts`, `e2e/home.spec.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/modules/auth/domain` (validadores, schemas Zod) | unit | Todas as branches; 1:1 com ACs de senha/CPF/idade/termos/normalização; edge cases de máscara | `src/modules/auth/__tests__/*.test.ts` | `pnpm test:unit` |
| `src/modules/auth/services` (ViaCEP) | unit | found / not_found / unavailable (timeout/erro); nunca lança | `src/modules/auth/__tests__/*.test.ts` | `pnpm test:unit` |
| `src/modules/auth/actions` (signUp, lookupCep, signIn/signOut) | integration | Signup feliz; unicidade e-mail/CPF → mesmo erro genérico; rejeições Zod sem linha no banco; login erro genérico | `src/modules/auth/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Rotas/páginas `src/app/{signup,login,terms,app}` + `src/proxy.ts` | e2e | Fluxo cadastro → `/app` → logout → login → logout; redirect deslogado em `/app`; termos públicos | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Config Better Auth, schema/migration, shadcn UI, components de formulário, `index.ts`/README | none | — (build gate; formulários verificados via E2E na task de wiring) | — | `pnpm lint && pnpm typecheck && pnpm build` |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Lógica pura / `fetch` mockado; sem estado compartilhado | `money.test.ts`, `env.test.ts` |
| integration | No | Um PostgreSQL compartilhado por suíte (Testcontainers ou `DATABASE_URL`) | `vitest.global-setup.ts`, `db.integration.test.ts` |
| e2e | No | Uma app + um banco via Playwright `webServer` | `playwright.config.ts` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `pnpm test:unit` |
| Full | Tasks com integração e/ou E2E | `pnpm test:unit && pnpm test:integration && pnpm test:e2e` |
| Build | Fim de fase / tasks config-only | `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` (+ integração/E2E quando existirem) |

---

## Execution Plan

### Phase 1: Domínio + persistência

```
     ┌→ T1 ──→ T2
start┤
     └→ T3 ──→ T4
```

(T1 ∥ T3; depois T2 ∥ T4)

### Phase 2: Actions + client + UI kit

```
T4 ──┬→ T5 [P]
     ├→ T6 [P]
     └→ T7
```

(T5 também pode iniciar após T3; a fase sincroniza após T4.)

### Phase 3: Formulários

```
T5, T6, T7 ──┬→ T8 [P]
             └→ T9 [P]
```

### Phase 4: Rotas + proxy + E2E + API pública

```
T8, T9 ──→ T10
```

> 4 fases → na Execute, oferecer sub-agents (um worker por fase) antes de iniciar.

---

## Task Breakdown

### T1: Domain validators + schemas Zod [P]

**What**: Funções puras e schemas Zod do cadastro/login (CPF, CEP, idade 18+, senha completa, confirmação, termos) + constantes de erro genérico.
**Where**: `src/modules/auth/domain/validators.ts`, `src/modules/auth/domain/schemas.ts`, `src/modules/auth/__tests__/validators.test.ts`, `schemas.test.ts`
**Depends on**: None
**Reuses**: Padrão puro de `src/shared/money/` + Zod (AD-003)
**Requirement**: AUTH-02, AUTH-05

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] `normalizeCpf`, `isValidCpf`, `normalizeZipCode`, `isAdult` implementados
- [ ] `passwordSchema`, `signUpInputSchema`, `loginInputSchema` + `GENERIC_SIGNUP_ERROR` / `GENERIC_LOGIN_ERROR`
- [ ] Senha: ≥8, minúscula, maiúscula, dígito, especial; confirmação igual; `termsAccepted: true`
- [ ] Unit tests cobrem ACs de validação + máscaras CPF/CEP + idade &lt;18
- [ ] Gate: `pnpm test:unit` verde

**Tests**: unit · **Gate**: quick
**Commit**: `feat(auth): validadores e schemas zod do cadastro`

---

### T2: ViaCEP service + unit tests [P]

**What**: Client `lookupCep` com timeout e statuses `found` | `not_found` | `unavailable` (nunca lança).
**Where**: `src/modules/auth/services/viacep.ts`, `src/modules/auth/__tests__/viacep.test.ts`
**Depends on**: T1
**Reuses**: `normalizeZipCode` de T1; `fetch` nativo
**Requirement**: AUTH-06, AUTH-07

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Timeout (~3s) → `unavailable`; CEP inexistente → `not_found`; sucesso → address fields
- [ ] Unit tests com `fetch` mockado para os 3 statuses
- [ ] Gate: `pnpm test:unit` verde

**Tests**: unit · **Gate**: quick
**Commit**: `feat(auth): serviço viacep com fail-open`

---

### T3: Better Auth additionalFields + minPasswordLength [P]

**What**: Estender `betterAuth({...})` com `user.additionalFields` (perfil + `termsAcceptedAt` `input: false`) e `emailAndPassword.minPasswordLength: 8`.
**Where**: `src/modules/auth/domain/auth.ts`
**Depends on**: None
**Reuses**: Instância atual em `domain/auth.ts`
**Requirement**: AUTH-04, AUTH-10

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Todos os campos do design presentes; `termsAcceptedAt.input === false`
- [ ] `minPasswordLength: 8`
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm test:unit`

**Tests**: none · **Gate**: build
**Commit**: `feat(auth): additionalFields e política mínima de senha no better auth`

---

### T4: Prisma User fields + @@unique(cpf) + migration

**What**: Campos de perfil no model `User`, `@@unique([cpf])`, migration; comentário de procedure pós-CLI.
**Where**: `prisma/schema.prisma`, `prisma/migrations/*`
**Depends on**: T3
**Reuses**: Models Better Auth existentes; procedure do design (Risks)
**Requirement**: AUTH-03, AUTH-04

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Schema reflete o data model do design (incl. `@@unique([cpf])`)
- [ ] Migration criada e aplicável (`prisma migrate`)
- [ ] Comentário no schema sobre reaplicar unique após CLI generate
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration`

**Tests**: none · **Gate**: build (+ integration smoke do schema)
**Commit**: `feat(auth): migration de perfil no user com cpf único`

---

### T5: Auth client tipado [P]

**What**: `createAuthClient` + `inferAdditionalFields` para login/logout no browser.
**Where**: `src/modules/auth/domain/auth-client.ts`
**Depends on**: T3
**Reuses**: Config server de T3
**Requirement**: AUTH-08, AUTH-12

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Client tipado com campos adicionais
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm test:unit`

**Tests**: none · **Gate**: build
**Commit**: `feat(auth): auth client tipado com additional fields`

---

### T6: shadcn Input, Label, Button, Checkbox [P]

**What**: Adicionar primitivos shadcn necessários aos formulários em `shared`.
**Where**: `src/shared/components/ui/{input,label,button,checkbox}.tsx`, `src/shared/index.ts`
**Depends on**: None
**Reuses**: Padrão `card.tsx` + AD-004
**Requirement**: AUTH-01 (suporte UI)

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Quatro componentes presentes e exportados via `@/shared`
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm build`

**Tests**: none · **Gate**: build
**Commit**: `chore(ui): adiciona input label button checkbox do shadcn`

---

### T7: Server actions + integration tests

**What**: `signUpAction`, `lookupCepAction`, `signInAction`, `signOutAction` — Zod, `termsAcceptedAt` server-side, erros genéricos, sessão.
**Where**: `src/modules/auth/actions/*.ts`, `src/modules/auth/__tests__/*.integration.test.ts`
**Depends on**: T1, T2, T3, T4
**Reuses**: Domain schemas, `auth.api.*`, `viacep`, `next/headers`
**Requirement**: AUTH-03, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-12

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Signup válido cria User com perfil + `termsAcceptedAt` e inicia sessão
- [ ] E-mail duplicado e CPF duplicado → mesma `GENERIC_SIGNUP_ERROR`; sem conta parcial
- [ ] Senha fraca / menor de 18 / CPF inválido → rejeição Zod, zero users criados
- [ ] Login inválido → `GENERIC_LOGIN_ERROR`; login válido cria sessão
- [ ] `lookupCepAction` delega ao service (fail-open)
- [ ] Gate: `pnpm test:unit && pnpm test:integration`

**Tests**: integration · **Gate**: full (unit + integration)
**Commit**: `feat(auth): server actions de signup login logout e cep`

---

### T8: SignUpForm [P]

**What**: Formulário de cadastro completo (pt-BR) com consulta CEP e submit via `signUpAction`.
**Where**: `src/modules/auth/components/sign-up-form.tsx`
**Depends on**: T6, T7
**Reuses**: shadcn T6; actions T7
**Requirement**: AUTH-01, AUTH-06

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Todos os campos da spec; link para `/terms`; CEP preenche endereço editável
- [ ] Exibe erros de campo / genérico
- [ ] Gate: `pnpm lint && pnpm typecheck`

**Tests**: none · **Gate**: build
**Commit**: `feat(auth): formulário de cadastro`

---

### T9: LoginForm + LogoutButton [P]

**What**: Formulário de login (erro genérico) e botão de logout (→ `/`).
**Where**: `src/modules/auth/components/login-form.tsx`, `logout-button.tsx`
**Depends on**: T5, T6, T7
**Reuses**: auth-client e/ou `signInAction`/`signOutAction`
**Requirement**: AUTH-08, AUTH-09, AUTH-12

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Login com falha mostra `GENERIC_LOGIN_ERROR`
- [ ] Logout encerra sessão e navega para `/`
- [ ] Gate: `pnpm lint && pnpm typecheck`

**Tests**: none · **Gate**: build
**Commit**: `feat(auth): formulários de login e logout`

---

### T10: Páginas, proxy, exports públicos, E2E

**What**: Rotas `/signup`, `/login`, `/terms`, `/app` (+ layout com `getSession`); `src/proxy.ts`; exports + README; E2E do fluxo completo.
**Where**: `src/app/signup/page.tsx`, `src/app/login/page.tsx`, `src/app/terms/page.tsx`, `src/app/app/{layout,page}.tsx`, `src/proxy.ts`, `src/modules/auth/index.ts`, `src/modules/auth/README.md`, `e2e/auth.spec.ts`
**Depends on**: T8, T9
**Reuses**: Components T8/T9; padrão `e2e/home.spec.ts`
**Requirement**: AUTH-01, AUTH-08, AUTH-11, AUTH-12, AUTH-13, AUTH-14

**Tools**: MCP: NONE · Skill: `tlc-spec-driven`

**Done when**:

- [ ] Deslogado em `/app` → `/login`; logado em `/login`|/signup` → `/app`
- [ ] `/terms` público com placeholder; `/app` saudação + logout
- [ ] E2E: cadastro → `/app` → logout → `/` → login → `/app` → logout
- [ ] README do módulo atualizado com a API pública
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build`

**Tests**: e2e · **Gate**: full
**Commit**: `feat(auth): rotas protegidas proxy e e2e do fluxo de auth`

---

## Parallel Execution Map

```
Phase 1:
  T1 ──→ T2
  T3 ──→ T4
  (T1 ∥ T3; T2 ∥ T4 após seus deps)

Phase 2:
  T4 complete, then:
    ├── T5 [P]
    ├── T6 [P]
    └── T7

Phase 3:
  T5, T6, T7 complete, then:
    ├── T8 [P]
    └── T9 [P]

Phase 4:
  T8, T9 complete, then:
    T10
```

**Parallelism constraint:** T7 e T10 não são `[P]` (integration/e2e não parallel-safe). T8/T9 são `[P]` (tests: none).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Domain validators + schemas | domain + unit tests | ✅ Granular |
| T2: ViaCEP service | 1 service + unit | ✅ Granular |
| T3: Auth config fields | 1 file config | ✅ Granular |
| T4: Prisma migration | schema + migration | ✅ Granular |
| T5: Auth client | 1 file | ✅ Granular |
| T6: shadcn kit | 4 primitivos coesos | ✅ OK |
| T7: Server actions + integration | fronteira + testes | ✅ OK |
| T8: SignUpForm | 1 component | ✅ Granular |
| T9: LoginForm + LogoutButton | 2 components coesos | ✅ OK |
| T10: Pages + proxy + E2E | wiring + verificação (merge forward) | ✅ OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start → T1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | start → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T3 | Phase 2 → T5 (após T3; fase sincroniza em T4) | ✅ Match |
| T6 | None | Phase 2 → T6 | ✅ Match |
| T7 | T1, T2, T3, T4 | Phase 2 após T4 → T7 | ✅ Match |
| T8 | T6, T7 | Phase 3 → T8 | ✅ Match |
| T9 | T5, T6, T7 | Phase 3 → T9 | ✅ Match |
| T10 | T8, T9 | T8, T9 → T10 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | domain validators/schemas | unit | unit | ✅ OK |
| T2 | services/viacep | unit | unit | ✅ OK |
| T3 | auth config | none | none | ✅ OK |
| T4 | schema/migration | none | none | ✅ OK |
| T5 | auth-client | none | none | ✅ OK |
| T6 | shadcn shared UI | none | none | ✅ OK |
| T7 | actions | integration | integration | ✅ OK |
| T8 | SignUpForm | none | none | ✅ OK |
| T9 | LoginForm + LogoutButton | none | none | ✅ OK |
| T10 | pages + proxy | e2e | e2e | ✅ OK |

---

## Requirement Traceability (tasks)

| Requirement | Tasks |
| ----------- | ----- |
| AUTH-01 | T8, T10 |
| AUTH-02 | T1 |
| AUTH-03 | T4, T7 |
| AUTH-04 | T3, T4, T7 |
| AUTH-05 | T1, T7 |
| AUTH-06 | T2, T7, T8 |
| AUTH-07 | T2, T7 |
| AUTH-08 | T5, T7, T9, T10 |
| AUTH-09 | T7, T9 |
| AUTH-10 | T3 |
| AUTH-11 | T10 |
| AUTH-12 | T7, T9, T10 |
| AUTH-13 | T10 |
| AUTH-14 | T10 |

**Coverage:** 14 total, 14 mapped, 0 unmapped ✅
