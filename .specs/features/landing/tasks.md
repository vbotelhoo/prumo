# Landing Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/landing/design.md`
**Status**: Approved (2026-07-23 — usuário; skill `impeccable` confirmada para T5, T6, T8–T10, T12–T13; execução ainda não iniciada)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `docs/TESTING.md` (pirâmide AD-011, nomenclatura, independência), `AGENTS.md` (gate dos 4 comandos, CPF válido em fixtures, sessão real em integração), `.github/workflows/ci.yml` (5 jobs).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `modules/auth/domain` (session-cookie helper) | unit | Todas as branches; 1:1 com LAND-16/17 (cookie presente, ausente, prefixo `__Secure-`) | `src/modules/auth/__tests__/*.test.ts` | `pnpm test:unit` |
| `_lib` de composição pública (nav âncoras, sample-data) | unit | Invariantes 1:1 com LAND-05 (soma de parcelas = total, saldo = entradas − saídas, centavos inteiros); branches da config | `src/app/(public)/_lib/__tests__/*.test.ts` | `pnpm test:unit` |
| Componentes + páginas públicas (shell, hero, seções, metadata) | e2e | Todo fluxo da spec: happy + edge (âncoras, viewport mobile 375px, CTA com/sem sessão, titles) | `e2e/landing.spec.ts` (+ `home.spec.ts` reescrito) | `pnpm test:e2e` |
| Forms auth (restyle de apresentação) | integration + e2e **existentes** | Suítes atuais intactas — asserções comportamentais não enfraquecem; ajuste de selector só com semântica preservada | `src/modules/auth/__tests__/`, `e2e/auth.spec.ts` | `pnpm test:integration && pnpm test:e2e` |
| Tokens de tema | unit **existente** (contraste AA) | Nenhum par texto/fundo novo sem entrar no teste | `src/app/__tests__/theme-contrast.test.ts` | `pnpm test:unit` |
| Layout/config (route group, moves) | none | — (typecheck/build + e2e existentes confirmam URLs) | — | build gate |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit | Yes | Sem I/O, sem estado compartilhado (project `unit` do Vitest) | `docs/TESTING.md` §Pirâmide; `vitest` projects |
| integration | No | Banco Postgres único por execução; cleanup global entre testes | `docs/TESTING.md` §Independência ("compartilham um único banco/app por execução") |
| e2e | No | App de produção + banco únicos via `webServer` do Playwright | `docs/TESTING.md` §Independência; `AGENTS.md` (sujeira de E2E em banco local) |

## Gate Check Commands

> Generated from codebase — confirm before Execute. **Pré-requisito de sessão de shell (sandbox):** `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` antes de qualquer comando (Vitest 4 exige Node ≥22.13; o shell resolve v20 por padrão).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com unit | `pnpm typecheck && pnpm lint && pnpm test:unit` |
| Full (scoped) | Tasks com e2e/integração | Quick + `pnpm test:integration && pnpm test:e2e [spec...]` (spec scoped à task; ver pré-requisitos de env em `docs/TESTING.md`) |
| Build | Fechamento de fase / feature | Quick + `pnpm test:integration && pnpm test:e2e && pnpm build` (E2E completo, sem scope) |

**Baselines (item 7, para detectar deleção silenciosa):** 193 unit · 156 integração · 39 E2E. Todo gate reporta contagem ≥ baseline (+ os novos da task).

---

## Execution Plan

### Phase 1: Fundação (Sequential)

```
T1 → T2 → T3
```

### Phase 2: Shell público (Sequential)

```
T3 → T4 → T5 → T6
```

### Phase 3: Landing (Sequential)

```
T6 → T7 → T8 → T9 → T10 → T11
```

### Phase 4: Auth restyle + fechamento (Sequential)

```
T11 → T12 → T13 → T14
```

> Nenhuma task marcada `[P]`: as únicas candidatas order-free (T1/T2; T12/T13) têm gates de integração/E2E não parallel-safe ou tocam arquivos vizinhos — sequencial é mais barato que o risco.

---

## Task Breakdown

### T1: `hasSessionCookie()` no módulo auth

**What**: Helper de detecção otimista de sessão (só cookie, sem banco) exposto na API pública do módulo auth.
**Where**: `src/modules/auth/domain/session-cookie.ts` + export em `src/modules/auth/index.ts` + `src/modules/auth/__tests__/session-cookie.test.ts`
**Depends on**: None
**Reuses**: padrão otimista de `src/proxy.ts` (`better-auth/cookies`)
**Requirement**: LAND-16, LAND-17, LAND-06

**Tools**:

- MCP: NONE (Context7 indisponível — verificar API do Better Auth para server components via WebFetch na doc oficial; nunca assumir nome de cookie)
- Skill: NONE

**Done when**:

- [ ] `hasSessionCookie(): Promise<boolean>` lê `await cookies()` e detecta o cookie de sessão via util/nome oficial do Better Auth (incl. variante `__Secure-` de produção)
- [ ] Zero import de Prisma/banco no arquivo
- [ ] Unit tests: cookie presente, ausente e com prefixo seguro (≥3 testes, 1:1 com LAND-16/17)
- [ ] Gate quick passa; unit ≥ 193 + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(auth): optimistic session cookie helper for public pages`

---

### T2: Route group `(public)` com layout mínimo

**What**: Mover `/`, `/login`, `/signup`, `/terms` para `src/app/(public)/` com `layout.tsx` mínimo (skip link + `<main id="main-content">`), URLs inalteradas.
**Where**: `src/app/(public)/{layout.tsx,page.tsx,login/,signup/,terms/}`
**Depends on**: T1 (ordem da fase; sem dependência de código)
**Reuses**: skip link e padrão de layout do `src/app/app/layout.tsx`
**Requirement**: LAND-15, LAND-18 (comportamento preservado)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] 4 rotas respondem nas mesmas URLs (route group não muda paths)
- [ ] `home.spec.ts`, `auth.spec.ts` e demais E2E existentes passam sem modificação
- [ ] Nenhum import de banco no layout
- [ ] Gate full passa (E2E completo — confirma que nenhuma rota quebrou); contagens ≥ baselines

**Tests**: none (camada layout/config — cobertura pelos E2E existentes no gate)
**Gate**: full
**Commit**: `refactor(app): public route group with minimal shared layout`

---

### T3: Promover `ThemeToggle` para `src/app/_components/`

**What**: Mover o componente (sem mudança de markup/comportamento) e atualizar o import do `app-shell.tsx`.
**Where**: `src/app/_components/theme-toggle.tsx`; modifica `src/app/app/_components/app-shell.tsx`
**Depends on**: T2
**Reuses**: componente existente na íntegra
**Requirement**: LAND-09 (pré-condição)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Arquivo movido; import antigo removido; zero diff de comportamento
- [ ] Gate full (scoped) passa: quick + `pnpm test:integration && pnpm test:e2e theme shell` (toggle da área logada intacto)

**Tests**: e2e existentes (theme/shell — nenhum novo)
**Gate**: full (scoped)
**Commit**: `refactor(shell): promote ThemeToggle to app-level shared components`

---

### T4: Config de âncoras `_lib/nav.ts`

**What**: Lista tipada das seções da landing (`{ id, label }[]`) consumida por header e page.
**Where**: `src/app/(public)/_lib/nav.ts` + `src/app/(public)/_lib/__tests__/nav.test.ts`
**Depends on**: T2
**Reuses**: padrão de `src/app/app/_lib/nav.ts` (+ teste)
**Requirement**: LAND-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] IDs únicos, hrefs `/#id`, labels pt-BR (unit cobre unicidade/formato)
- [ ] Gate quick passa; unit ≥ baseline + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(landing): public nav anchors config`

---

### T5: `PublicHeader` + wiring no layout + E2E do shell público

**What**: Header público (wordmark, âncoras só na landing, CTAs por sessão, ThemeToggle, sticky, mobile sem âncoras) ligado ao layout via `hasSessionCookie()`; `home.spec.ts` ajustado (strict mode) e `landing.spec.ts` criado (parte shell).
**Where**: `src/app/(public)/_components/public-header.tsx`; modifica `(public)/layout.tsx`; `e2e/landing.spec.ts` (novo); `e2e/home.spec.ts` (ajuste mínimo: asserção do wordmark via `role=banner`/`first()` — reescrita completa no T8)
**Depends on**: T1, T3, T4
**Reuses**: `Button`/`buttonVariants` (shared), classes de foco do AppShell, padrão client `usePathname`
**Requirement**: LAND-07, LAND-09, LAND-10 (parcial — presença/ausência), LAND-11, LAND-12, LAND-16, LAND-17

**Tools**: MCP: NONE · Skill: `impeccable` (craft do header no canon)

**Done when**:

- [ ] Anônimo vê "Entrar"+"Criar conta" navegando para `/login`/`/signup`; com cookie de sessão vê "Ir para o app" → `/app` (E2E ambos)
- [ ] Âncoras presentes em `/`, ausentes em `/login`/`/signup`/`/terms` (E2E)
- [ ] Viewport 375px: âncoras ocultas, wordmark+CTAs+toggle visíveis, sem overflow horizontal (E2E)
- [ ] Toggle de tema público persiste na área logada (E2E cruzando as duas áreas)
- [ ] Landmarks + foco visível; nenhum par de cor fora dos tokens verificados
- [ ] Gate full (scoped `landing home theme auth`) passa; contagens ≥ baselines + novos

**Tests**: e2e
**Gate**: full (scoped)
**Commit**: `feat(landing): public header with session-aware CTAs and theme toggle`

---

### T6: `PublicFooter`

**What**: Footer público (wordmark + tagline, link `/terms`, copyright) no layout, com asserts E2E nas 4 páginas.
**Where**: `src/app/(public)/_components/public-footer.tsx`; modifica `(public)/layout.tsx`; adiciona a `e2e/landing.spec.ts`
**Depends on**: T5
**Reuses**: tokens de tipografia/cor; padrão de landmarks
**Requirement**: LAND-08, LAND-12, LAND-15

**Tools**: MCP: NONE · Skill: `impeccable`

**Done when**:

- [ ] Footer visível nas 4 páginas públicas com tagline exata e link `/terms` funcionando (E2E)
- [ ] Nenhum link social/institucional inexistente
- [ ] Gate full (scoped `landing`) passa

**Tests**: e2e
**Gate**: full (scoped)
**Commit**: `feat(landing): public footer`

---

### T7: Fixture `sample-data.ts` com invariantes testadas

**What**: Dados de exemplo tipados (plano parcelado + projeções mensais) com aritmética garantida por unit tests.
**Where**: `src/app/(public)/_lib/sample-data.ts` + `__tests__/sample-data.test.ts`
**Depends on**: T2
**Reuses**: `money`/`formatBRL` de shared (AD-008); regra da 1ª parcela (AD-009)
**Requirement**: LAND-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `sum(installmentsCents) === totalCents`; `projectedBalanceCents === incomeCents − expensesCents`; todos os valores inteiros (unit, 1:1 com LAND-05)
- [ ] Formatação só via helpers de shared
- [ ] Gate quick passa; unit ≥ baseline + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(landing): sample data fixture with tested invariants`

---

### T8: Hero + `HeroPreview` (substitui o placeholder)

**What**: Seção hero na `(public)/page.tsx` — h1 com proposta de valor, tagline, CTAs primário/outline — e mockup da projeção mensal em componentes; `home.spec.ts` reescrito para o hero.
**Where**: `src/app/(public)/_components/{hero.tsx,hero-preview.tsx}`; modifica `(public)/page.tsx`; reescreve `e2e/home.spec.ts`; adiciona a `e2e/landing.spec.ts`
**Depends on**: T5, T7
**Reuses**: `Card` (shared), fixture T7, hierarquia Display do DESIGN.md
**Requirement**: LAND-01, LAND-02

**Tools**: MCP: NONE · Skill: `impeccable` (hero é a superfície de persuasão central)

**Done when**:

- [ ] `/` exibe h1, tagline, CTAs "Criar conta"→`/signup` e "Entrar"→`/login` (E2E)
- [ ] `HeroPreview` renderiza valores da fixture (tabular-nums, semântica só em número), decorativo com `aria-hidden` + alternativa textual
- [ ] Legível nos 2 temas (pares de token já verificados pelo teste de contraste)
- [ ] `home.spec.ts` reescrito: 200 + hero (asserções por role, sem strict-mode violation)
- [ ] Gate full (scoped `landing home`) passa

**Tests**: e2e
**Gate**: full (scoped)
**Commit**: `feat(landing): hero with component-built product preview`

---

### T9: Seções de valor alternadas + mini-visuais

**What**: `ValueSection` genérica (título, texto, mini-visual, `reverse`) instanciada 3× (previsibilidade, parcelas, projeção) com `id`s de âncora consumindo a fixture.
**Where**: `src/app/(public)/_components/value-section.tsx` (+ mini-visuais no mesmo arquivo ou vizinhos); modifica `(public)/page.tsx`; adiciona a `e2e/landing.spec.ts`
**Depends on**: T4, T8
**Reuses**: fixture T7, `Card` (shared), Named Rules do DESIGN.md
**Requirement**: LAND-03

**Tools**: MCP: NONE · Skill: `impeccable`

**Done when**:

- [ ] 3 seções com `id` = âncoras de T4, alternando lados ≥`md`, empilhadas no mobile (E2E: presença + viewport)
- [ ] Mini-visuais com dados da fixture (soma exata visível no card de parcelas)
- [ ] Copy pt-BR calma e direta (DESIGN.md Do's)
- [ ] Gate full (scoped `landing`) passa

**Tests**: e2e
**Gate**: full (scoped)
**Commit**: `feat(landing): alternating value sections with sample visuals`

---

### T10: Seção de fechamento + scroll de âncoras

**What**: Closing CTA (reforço da tagline + "Criar conta") e CSS de scroll (`scroll-behavior: smooth` sob `prefers-reduced-motion: no-preference`, `scroll-margin-top` compensando o header sticky).
**Where**: `src/app/(public)/_components/closing-cta.tsx`; modifica `(public)/page.tsx` e `src/app/globals.css`; adiciona a `e2e/landing.spec.ts`
**Depends on**: T9
**Reuses**: tokens; âncoras T4
**Requirement**: LAND-04, LAND-10 (scroll)

**Tools**: MCP: NONE · Skill: `impeccable`

**Done when**:

- [ ] Fechamento antes do footer com CTA → `/signup` (E2E)
- [ ] Clicar âncora do header rola até a seção, título não encoberto pelo header sticky (E2E)
- [ ] Guard de `prefers-reduced-motion` presente no CSS
- [ ] Gate full (scoped `landing`) passa

**Tests**: e2e
**Gate**: full (scoped)
**Commit**: `feat(landing): closing CTA and anchor scroll behavior`

---

### T11: Metadata das páginas públicas

**What**: `export const metadata` por página conforme a tabela de assumptions da spec.
**Where**: `(public)/page.tsx`, `login/page.tsx`, `signup/page.tsx`, `terms/page.tsx`; adiciona asserts de `title` a `e2e/landing.spec.ts`
**Depends on**: T8
**Reuses**: default do root layout
**Requirement**: LAND-19

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Titles exatos da spec nas 4 páginas (E2E `toHaveTitle`); landing com description da proposta de valor
- [ ] Gate full (scoped `landing`) passa

**Tests**: e2e
**Gate**: full (scoped)
**Commit**: `feat(landing): public pages metadata`

---

### T12: Restyle `/login` + `LoginForm`

**What**: Card centrado sob o shell público + polish de apresentação do form (hierarquia, espaçamento, copy, estados de erro) sem mudar comportamento.
**Where**: `(public)/login/page.tsx`; `src/modules/auth/components/login-form.tsx`
**Depends on**: T5
**Reuses**: primitivos shared; DESIGN.md Buttons/Cards
**Requirement**: LAND-13, LAND-14

**Tools**: MCP: NONE · Skill: `impeccable`

**Done when**:

- [ ] Apresentação conforme DESIGN.md nos 2 temas; `actions/` intocadas; campos/validação/mensagens comportamentais idênticos
- [ ] Suítes de auth existentes passam (integração + `pnpm test:e2e auth`) — asserções não enfraquecidas; selector só se semântica preservada
- [ ] Gate full (scoped `auth landing`) passa; contagens ≥ baselines

**Tests**: integration + e2e existentes
**Gate**: full (scoped)
**Commit**: `feat(auth): align login page and form presentation with design system`

---

### T13: Restyle `/signup` + `SignUpForm`

**What**: Mesmo contrato do T12 para o cadastro (form maior: CEP, termos — atenção redobrada à semântica).
**Where**: `(public)/signup/page.tsx`; `src/modules/auth/components/sign-up-form.tsx`
**Depends on**: T12
**Reuses**: padrões aplicados no T12
**Requirement**: LAND-13, LAND-14

**Tools**: MCP: NONE · Skill: `impeccable`

**Done when**:

- [ ] Mesmos critérios do T12 aplicados ao signup (incl. lookup de CEP e aceite de termos intactos)
- [ ] Gate full (scoped `auth landing`) passa; contagens ≥ baselines

**Tests**: integration + e2e existentes
**Gate**: full (scoped)
**Commit**: `feat(auth): align signup page and form presentation with design system`

---

### T14: Gate final + documentação

**What**: Build gate completo (todas as suítes, sem scope) + atualizar `ROADMAP.md` (status item 8) e traceability da spec para Implementing→Verified.
**Where**: `ROADMAP.md`; `.specs/features/landing/spec.md`
**Depends on**: T13 (todas)
**Reuses**: lição do AGENTS.md — roadmap faz parte do gate de conclusão, não é commit opcional solto
**Requirement**: todas (fechamento)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Gate Build passa: quick + integração + E2E completo + `pnpm build`; contagens finais registradas
- [ ] `ROADMAP.md` item 8 atualizado com status e contagens
- [ ] Traceability da spec atualizada

**Tests**: none (docs — gate Build cobre)
**Gate**: build
**Commit**: `docs(landing): mark roadmap item 8 complete with final gate counts`

---

## Parallel Execution Map

```
Phase 1 (Sequential): T1 ──→ T2 ──→ T3
Phase 2 (Sequential): T3 ──→ T4 ──→ T5 ──→ T6
Phase 3 (Sequential): T6 ──→ T7 ──→ T8 ──→ T9 ──→ T10 ──→ T11
Phase 4 (Sequential): T11 ──→ T12 ──→ T13 ──→ T14
```

Nenhum `[P]`: integração/E2E não são parallel-safe (banco/app únicos) e as candidatas order-free compartilham arquivos (`layout.tsx`, `page.tsx`, `landing.spec.ts`).

> 4 fases → na entrada do Execute, a oferta de um sub-agente por fase (sequencial) é obrigatória antes de começar (SKILL.md, Sub-Agent Delegation).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 helper + testes | ✅ Granular |
| T2 | 1 layout + moves mecânicos (mesma mudança atômica) | ✅ Coeso |
| T3 | 1 move + 1 import | ✅ Granular |
| T4 | 1 config + teste | ✅ Granular |
| T5 | 1 componente + wiring + E2E co-localizado | ✅ Coeso (E2E é do componente) |
| T6 | 1 componente | ✅ Granular |
| T7 | 1 fixture + testes | ✅ Granular |
| T8 | 2 componentes coesos (hero + preview) + page | ✅ Coeso |
| T9 | 1 componente genérico ×3 instâncias + mini-visuais | ⚠️ OK — um conceito (seção de valor); split se estourar |
| T10 | 1 componente + CSS | ✅ Granular |
| T11 | metadata ×4 (mesma mudança) | ✅ Coeso |
| T12 | 1 página + 1 form | ✅ Coeso |
| T13 | 1 página + 1 form | ✅ Coeso |
| T14 | docs + gate | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início Phase 1 | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T2 | T3→T4 (fase sequencial contém T2→T3) | ✅ Match |
| T5 | T1, T3, T4 | T4→T5 (T1/T3 anteriores na cadeia) | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T2 | T6→T7 (T2 anterior na cadeia) | ✅ Match |
| T8 | T5, T7 | T7→T8 (T5 anterior na cadeia) | ✅ Match |
| T9 | T4, T8 | T8→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |
| T11 | T8 | T10→T11 (T8 anterior na cadeia) | ✅ Match |
| T12 | T5 | T11→T12 (T5 anterior na cadeia) | ✅ Match |
| T13 | T12 | T12→T13 | ✅ Match |
| T14 | T13 (todas) | T13→T14 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | auth domain helper | unit | unit | ✅ OK |
| T2 | layout/config (moves) | none (E2E existentes no gate) | none + gate full | ✅ OK |
| T3 | componente (move sem mudança) | e2e | e2e existentes (theme/shell) no gate | ✅ OK |
| T4 | `_lib` composição | unit | unit | ✅ OK |
| T5 | componente + página pública | e2e | e2e (novos, mesma task) | ✅ OK |
| T6 | componente público | e2e | e2e (novos, mesma task) | ✅ OK |
| T7 | `_lib` fixture | unit | unit | ✅ OK |
| T8 | componentes + página | e2e | e2e (novos + home reescrito) | ✅ OK |
| T9 | componentes + página | e2e | e2e (novos) | ✅ OK |
| T10 | componente + CSS | e2e | e2e (novos) | ✅ OK |
| T11 | metadata (páginas) | e2e | e2e (titles) | ✅ OK |
| T12 | página + form auth | integration + e2e existentes | integration + e2e existentes | ✅ OK |
| T13 | página + form auth | integration + e2e existentes | integration + e2e existentes | ✅ OK |
| T14 | docs | none | none + gate build | ✅ OK |
