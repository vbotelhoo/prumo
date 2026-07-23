# App Shell + Fundação de Design — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/app-shell/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md`, `docs/TESTING.md`, `vitest` projects em `package.json`, `playwright.config.ts`, `.github/workflows` (CI de 5 checks).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Helper puro (`_lib/nav.ts`) | unit | 1:1 com SHELL-03 + edge cases (sub-rota por prefixo, `/app` exato, nunca dois ativos) | `src/app/app/_lib/__tests__/*.test.ts` | `pnpm test:unit` |
| Tokens de tema (`globals.css`) | unit (verificação de contraste) | Todo par texto/fundo usado pelo shell cumpre AA nos DOIS temas (SHELL-14) | `src/app/__tests__/theme-contrast.test.ts` | `pnpm test:unit` |
| Componentes do shell + layout (`_components/`, `layout.tsx`, providers) | e2e | Happy + edge + erro dos fluxos: navegação com `aria-current`, logout, drawer mobile, tema (sistema/toggle/persistência/sem flash) | `e2e/*.spec.ts` | `pnpm test:e2e` |
| `data/`/`actions/` | integration | — não tocados nesta feature (suíte existente protege regressão) | `src/modules/**/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Config/deps (next-themes, sheet vendored) | none | — build gate only | — | `pnpm build` |

Baselines a preservar (STATE.md Handoff): **149 unit / 156 integration / 22 e2e** — nenhuma suíte pode encolher.

**Ambiente**: Node v24 via nvm — exportar o PATH do nvm antes de qualquer `pnpm test/typecheck/lint` (Vitest 4 exige Node 22.13+; memória do projeto).

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Sem deps externas (TS puro) | `vitest --project unit`; `docs/TESTING.md` |
| integration | No (entre tasks) | PostgreSQL local compartilhado; cleanup global por tabela | `AGENTS.md` (banco sujo entre suítes; FK violations) |
| e2e | Yes (intra-suíte) / No (vs integration) | `fullyParallel: true` no Playwright, mas mesmo Postgres local; specs não limpam dados | `playwright.config.ts:17`; `AGENTS.md` |

Execução inline (3 fases): tasks rodam sequencialmente; `[P]` indica apenas ausência de dependência de ordem.

## Gate Check Commands

> Generated from codebase — confirm before Execute. (AGENTS.md: lint+typecheck obrigatórios antes de QUALQUER commit; os 4 verdes antes de PR.)

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Task só com unit | `pnpm lint && pnpm typecheck && pnpm test:unit` |
| Full | Task com e2e (ou que toca fluxo de página) | `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e` |
| Build | Fechamento de fase / task só de config | Full + `pnpm build` |

---

## Execution Plan

### Phase 1 — Fundação (T1–T3)

```
T1 [P]   T2 [P]   T3 [P]     (independentes entre si)
```

### Phase 2 — Shell (T4–T7)

```
T4 ──→ T6
T1,T3 ──→ T5 ──→ T6 ──→ T7 (T7 também depende de T2)
```

### Phase 3 — Acabamento (T8–T9)

```
T5,T6,T7 ──→ T8 ──→ T9
```

---

## Task Breakdown

### T1: Tokens de tema Prumo (claro/escuro) + teste de contraste [P]

**What**: Reescrever a paleta em `globals.css` (`:root` + `.dark`) com a identidade canon do DESIGN.md (neutros + acento raro + semânticos financeiros), e um teste unit que parseia os pares token texto/fundo e verifica contraste AA nos dois temas.
**Where**: `src/app/globals.css`; `src/app/__tests__/theme-contrast.test.ts`
**Depends on**: None
**Reuses**: variáveis shadcn existentes (nomes mantidos, valores novos); `DESIGN.md` (estratégia); skill `dataviz` para validar paleta de gráficos (`--chart-*`)
**Requirement**: SHELL-13, SHELL-14

**Tools**: Skill: `impeccable` (craft-floor antes de editar UI), `dataviz` (tokens `--chart-*`)

**Done when**:

- [ ] Temas claro e escuro definidos apenas em `globals.css` (nenhum hex novo em componente)
- [ ] Teste de contraste passa: todo par usado pelo shell ≥ 4.5:1 (texto) / ≥ 3:1 (UI) nos dois temas
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm test:unit`
- [ ] Test count: ≥ 150 unit (149 + contraste), sem deleções

**Tests**: unit · **Gate**: quick
**Commit**: `feat(design): Prumo theme tokens (light/dark) with AA contrast test`

---

### T2: ThemeProvider global (next-themes) [P]

**What**: Instalar `next-themes`, criar `Providers` e aplicá-lo no root layout (`suppressHydrationWarning` no `<html>`, `attribute="class"`, `defaultTheme="system"`, `enableSystem`); e2e cobrindo tema seguindo o sistema (colorScheme emulado → classe `dark` no primeiro paint).
**Where**: `src/app/providers.tsx`; `src/app/layout.tsx`; `e2e/theme.spec.ts` (parcial)
**Depends on**: None
**Reuses**: variante `dark` já configurada no CSS (`@custom-variant dark`)
**Requirement**: SHELL-18, SHELL-20 (mecanismo)

**Tools**: Skill: NONE (wiring)

**Done when**:

- [ ] Sem preferência salva, tema segue `prefers-color-scheme` (e2e com `colorScheme: 'dark'` e `'light'`)
- [ ] Sem hydration warning no console durante o e2e
- [ ] Gate: Full
- [ ] Test count: ≥ 23 e2e, sem deleções

**Tests**: e2e · **Gate**: full
**Commit**: `feat(design): global theme provider following system preference`

---

### T3: Config de navegação + isActive() com testes [P]

**What**: `NAV_ITEMS` (5 itens, ordem da spec, `exact` para `/app`) e `isActive(pathname, item)` puro, com unit tests 1:1 ao SHELL-03 + edges (sub-rota `/app/commitments/123`, nunca dois ativos, `/app` exato).
**Where**: `src/app/app/_lib/nav.ts`; `src/app/app/_lib/__tests__/nav.test.ts`
**Depends on**: None
**Reuses**: padrão de `_lib` puro + testes de `merge-category-spending`
**Requirement**: SHELL-01 (fonte dos itens), SHELL-03 (lógica)

**Tools**: Skill: NONE

**Done when**:

- [ ] Para cada rota da spec, exatamente um item ativo (teste parametrizado)
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm test:unit`
- [ ] Test count cresce (≥ 150 antes de T1, somam-se), sem deleções

**Tests**: unit · **Gate**: quick
**Commit**: `feat(shell): nav items config and pure isActive helper`

---

### T4: Primitivo Sheet (shadcn) [P]

**What**: Adicionar o componente `sheet` do shadcn/ui a `src/shared/components/ui/` (vendored), sem customização além do padrão do projeto.
**Where**: `src/shared/components/ui/sheet.tsx`
**Depends on**: None
**Reuses**: pipeline shadcn já configurado (10 primitivos existentes)
**Requirement**: infra para SHELL-09/11

**Tools**: Skill: NONE

**Done when**:

- [ ] `pnpm build` verde; lint de fronteiras verde
- [ ] Gate: `pnpm lint && pnpm typecheck && pnpm build`

**Tests**: none (config/vendored) · **Gate**: build
**Commit**: `feat(shared): add shadcn sheet primitive`

---

### T5: AppShell desktop + integração no layout

**What**: `AppShell` (client) com sidebar fixa ≥`lg`: marca Prumo→`/app`, 5 links com `aria-current` via `isActive`, nome do usuário (truncado), `LogoutButton` do auth; skip link como primeiro focável; integração em `src/app/app/layout.tsx` (guard intacto, passa `userName`); remoção do `LogoutButton` duplicado da página do dashboard; e2e: navegar pelas 5 seções verificando `aria-current`, logout a partir de `/app/categories` com redirect a `/`, guard sem sessão.
**Where**: `src/app/app/_components/app-shell.tsx`; `src/app/app/layout.tsx`; página do dashboard (remoção); `e2e/shell.spec.ts`
**Depends on**: T1, T3
**Reuses**: `LogoutButton` e `auth.api.getSession` (módulo auth, API pública); `Button`/`Separator` de shared
**Requirement**: SHELL-01..07, SHELL-15, SHELL-16, SHELL-17

**Tools**: Skill: `impeccable` (craft-floor antes de editar UI)

**Done when**:

- [ ] Sidebar presente nas 5 rotas com exatamente um `aria-current="page"` correto em cada
- [ ] "Sair" único na árvore, funciona de qualquer página (redirect `/`), guard preservado
- [ ] Skip link primeiro focável; nav é landmark rotulada; foco visível nos itens
- [ ] Suítes E2E existentes ajustadas se seletores quebraram (lição do projeto), sem enfraquecer asserções
- [ ] Gate: Full
- [ ] Test count: e2e cresce (≥ 26), sem deleções

**Tests**: e2e · **Gate**: full
**Commit**: `feat(shell): desktop sidebar navigation with session and logout`

---

### T6: Drawer mobile

**What**: Abaixo de `lg`, topbar com botão de menu (rótulo acessível) abrindo drawer (Sheet) com os mesmos itens/ações; fecha ao navegar, `Esc` e overlay; e2e em viewport 390×844.
**Where**: `src/app/app/_components/app-shell.tsx` (extensão); `e2e/shell.spec.ts` (bloco mobile)
**Depends on**: T4, T5
**Reuses**: `Sheet` de T4; `NAV_ITEMS`/`isActive` de T3
**Requirement**: SHELL-08..11

**Tools**: Skill: `impeccable` (craft-floor)

**Done when**:

- [ ] e2e mobile: menu → drawer → link → navega e fecha; `Esc` e overlay fecham
- [ ] Sidebar oculta e topbar visível abaixo de 1024px (e desaparece acima)
- [ ] Gate: Full
- [ ] Test count: e2e cresce, sem deleções

**Tests**: e2e · **Gate**: full
**Commit**: `feat(shell): mobile top bar and navigation drawer`

---

### T7: ThemeToggle no shell

**What**: Controle claro/escuro/sistema no shell (sidebar e drawer), com rótulo acessível e estado ativo exposto; e2e: alternância imediata sem reload, persistência após reload sem flash (asserção no primeiro paint), rótulos corretos.
**Where**: `src/app/app/_components/theme-toggle.tsx`; `AppShell`; `e2e/theme.spec.ts` (completo)
**Depends on**: T2, T6
**Reuses**: `useTheme()` de next-themes; primitivos de shared
**Requirement**: SHELL-19, SHELL-20, SHELL-21 (+ edge de mudança do SO com "sistema" ativo)

**Tools**: Skill: `impeccable` (craft-floor)

**Done when**:

- [ ] e2e: selecionar escuro → classe muda sem navegação; reload → escuro aplicado sem flash; voltar a "sistema" → segue colorScheme emulado
- [ ] Controle com rótulo acessível e opção ativa identificável programaticamente
- [ ] Gate: Full
- [ ] Test count: e2e cresce, sem deleções

**Tests**: e2e · **Gate**: full
**Commit**: `feat(shell): theme toggle with system default and persistence`

---

### T8: Auditoria dark das páginas existentes

**What**: Visitar as 5 páginas internas + home/login/signup nos dois temas (screenshots via Playwright); corrigir apenas ilegibilidade causada por classes hardcoded (ex.: `bg-zinc-50 dark:bg-black` na home) trocando-as por tokens — polish completo fica no item 9 do roadmap.
**Where**: pontuais em `src/app/**/page.tsx` e componentes com cor hardcoded
**Depends on**: T5, T6, T7
**Reuses**: tokens de T1; skill `run` para inspecionar a app real
**Requirement**: mitigação do risco 1 do design.md (SHELL-14 no alcance global do tema)

**Tools**: Skill: `impeccable` (craft-floor), `run`

**Done when**:

- [ ] Nenhuma página ilegível no tema escuro (checklist com screenshot por página nos dois temas)
- [ ] Zero regressão nas suítes existentes
- [ ] Gate: Full
- [ ] Test count: baselines mantidos

**Tests**: none novo (e2e existentes protegem) · **Gate**: full
**Commit**: `fix(design): dark-theme legibility pass on existing pages`

---

### T9: Carbonizar DESIGN.md + detector + docs

**What**: Rodar o detector mecânico do impeccable sobre a UI alterada e resolver findings; re-rodar `document` (scan mode) para carbonizar DESIGN.md com os tokens reais + sidecar `.impeccable/design.json`; atualizar `ROADMAP.md` (item 7 concluído, mesmo commit — regra do AGENTS.md), traceability da spec (Status → Implementing/Verified) e STATE.md Handoff.
**Where**: `DESIGN.md`; `.impeccable/design.json`; `ROADMAP.md`; `.specs/features/app-shell/spec.md`; `.specs/STATE.md`
**Depends on**: T8
**Reuses**: `detect.mjs` do impeccable; reference `document.md`
**Requirement**: SHELL-12

**Tools**: Skill: `impeccable` (document + detector)

**Done when**:

- [ ] Detector sem findings pendentes nos arquivos do shell
- [ ] DESIGN.md sem `[to be resolved]` remanescente; sidecar gerado
- [ ] ROADMAP/spec/STATE atualizados no mesmo commit
- [ ] Gate: Build (full + `pnpm build`)

**Tests**: none (docs/design) · **Gate**: build
**Commit**: `docs(design): carbonize DESIGN.md tokens and close roadmap item 7`

---

## Parallel Execution Map

```
Phase 1: T1 [P] · T2 [P] · T3 [P]   (order-free; execução inline sequencial)
Phase 2: T4 [P antes de T6] ; (T1,T3)→T5 → (T4,T5)→T6 → (T2,T6)→T7
Phase 3: (T5,T6,T7)→T8 → T9
```

3 fases → execução inline (sem sub-agentes), Verifier automático após T9.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 arquivo CSS + 1 teste | ✅ |
| T2 | 1 provider + wiring + 1 spec e2e | ✅ (coeso) |
| T3 | 1 helper + testes | ✅ |
| T4 | 1 primitivo vendored | ✅ |
| T5 | 1 componente + wiring do layout + e2e | ✅ (coeso; remoção do Sair duplicado é 1 linha do mesmo fluxo) |
| T6 | extensão do mesmo componente + e2e | ✅ |
| T7 | 1 componente + e2e | ✅ |
| T8 | correções pontuais guiadas por checklist | ✅ (escopo limitado a ilegibilidade) |
| T9 | docs/design | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | Phase 1 [P] | ✅ |
| T2 | None | Phase 1 [P] | ✅ |
| T3 | None | Phase 1 [P] | ✅ |
| T4 | None | Phase 2, antes de T6 | ✅ |
| T5 | T1, T3 | (T1,T3)→T5 | ✅ |
| T6 | T4, T5 | (T4,T5)→T6 | ✅ |
| T7 | T2, T6 | (T2,T6)→T7 | ✅ |
| T8 | T5, T6, T7 | (T5,T6,T7)→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | Tokens de tema | unit (contraste) | unit | ✅ |
| T2 | Provider/layout (fluxo de página) | e2e | e2e | ✅ |
| T3 | Helper puro | unit | unit | ✅ |
| T4 | Config/vendored | none (build) | none/build | ✅ |
| T5 | Componente shell + layout | e2e | e2e | ✅ |
| T6 | Componente shell | e2e | e2e | ✅ |
| T7 | Componente shell | e2e | e2e | ✅ |
| T8 | Ajustes pontuais de página | e2e existentes (proteção) | full gate | ✅ |
| T9 | Docs/design | none | none/build | ✅ |
