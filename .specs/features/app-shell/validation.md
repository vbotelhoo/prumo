# App Shell + Fundação de Design — Validation

**Date**: 2026-07-23
**Spec**: `.specs/features/app-shell/spec.md`
**Diff range**: `34352d5..HEAD` (branch `cursor/spec-app-shell`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Theme tokens + contrast test — commit `2db528b` |
| T2   | ✅ Done | `ThemeProvider` global — commit `8b001f4` |
| T3   | ✅ Done | `NAV_ITEMS`/`isActive()` — commit `a0ff37d` |
| T4   | ✅ Done | Vendored `Sheet` primitive — commit `1617854` |
| T5   | ✅ Done | Desktop sidebar + layout wiring — commit `a2d5153` |
| T6   | ✅ Done | Mobile drawer — commit `a57ffa4` |
| T7   | ✅ Done | Theme toggle — commit `82537bd` |
| T8   | ✅ Done | Dark-mode legibility pass (4 pages) — commit `b09b6bc` |
| T9   | ✅ Done | DESIGN.md carbonization + roadmap/spec/STATE update — commit `20264fe` |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| SHELL-01: rota sob `/app` renderiza sidebar com os 5 links, nesta ordem | Array exato `[Dashboard→/app, Transações→/app/transactions, Compromissos→/app/commitments, Categorias→/app/categories, Projeções→/app/projections]` | `src/app/app/_lib/__tests__/nav.test.ts:7-13` — `expect(NAV_ITEMS.map(...)).toEqual([...])`; e2e `e2e/shell.spec.ts:64-74` iterates `SECTIONS` in the same order | ✅ PASS |
| SHELL-02: clique no link navega e mostra a página de destino | URL passa a corresponder à rota do item clicado | `e2e/shell.spec.ts:67-68` — `nav.getByRole("link",{name}).click(); expect(page).toHaveURL(new RegExp(...))` | ✅ PASS |
| SHELL-03: exatamente um `aria-current="page"`, exato em `/app`, prefixo com fronteira de segmento nas demais | Para as 5 rotas reais e para sub-rotas, `filter(isActive).length === 1`; `/app/commitments-extra` não ativa "Compromissos" | `nav.test.ts:31-35` (5 rotas, 1 ativo cada); `nav.test.ts:51-54` (`/app/commitments-extra` → `false`); `nav.test.ts:44-48` (Dashboard não vaza); `nav.test.ts:57-61` (sub-rota, 1 ativo); e2e `shell.spec.ts:71-73` — `expect(current).toHaveCount(1)` | ✅ PASS |
| SHELL-04: marca "Prumo" no topo, link para `/app` | Clique navega a `/app` | `src/app/app/_components/app-shell.tsx:89-94` (implementação); `e2e/shell.spec.ts:81-82` — clique + `expect(page).toHaveURL(/\/app$/)` | ✅ PASS |
| SHELL-05: nome do usuário visível em qualquer página sob `/app` | Nome da sessão renderizado | `e2e/shell.spec.ts:91-92` — `page.goto("/app/categories"); expect(page.getByText(name,...)).toBeVisible()` | ✅ PASS |
| SHELL-06: "Sair" encerra sessão e redireciona para `/` | `toHaveURL(/\/$/)` após clique | `e2e/shell.spec.ts:94-95` | ✅ PASS |
| SHELL-07: sem sessão, `/app` redireciona a `/login` (AUTH-11 preservado) | `toHaveURL(/\/login$/)` | `src/app/app/layout.tsx:16-18` (guard inalterado); `e2e/shell.spec.ts:98-99` | ✅ PASS |
| SHELL-08: `<lg` oculta sidebar, mostra topbar com botão de menu | `aside` não visível, botão "Abrir menu" visível | `e2e/shell.spec.ts:148-149` (viewport 390×844) | ✅ PASS |
| SHELL-09: drawer abre com mesmos links/marca/ações | dialog visível com "Prumo", link "Transações", botão "Sair" | `e2e/shell.spec.ts:158-162` | ✅ PASS |
| SHELL-10: link do drawer navega e fecha o drawer | URL muda + `dialog` não visível | `e2e/shell.spec.ts:166-167` | ✅ PASS |
| SHELL-11: Esc/overlay fecham o drawer | `dialog` não visível após cada gatilho | `e2e/shell.spec.ts:176-177` (Esc); `:189-190` (overlay click) | ✅ PASS |
| SHELL-12: `PRODUCT.md`/`DESIGN.md` existem e refletem identidade via `impeccable` | Arquivos existentes, com paleta/tipografia reais (não placeholder) | `PRODUCT.md` (4424 bytes), `DESIGN.md` (11748 bytes, seção `colors`/`typography` com valores oklch/Geist reais, sem `[to be resolved]`), `.impeccable/design.json` (sidecar gerado) — verificado por leitura direta | ✅ PASS |
| SHELL-13: `globals.css` é única fonte de cor; nenhum componente do shell com cor hardcoded | Zero literais hex/rgb/oklch fora de `globals.css` nos componentes do shell | Grep `#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|oklch\(` sobre `src/app/app/_components/*`, `src/app/app/_lib/*` → 0 ocorrências (verificação manual, consistente com o "Independent Test" do spec.md, que também prescreve grep); `theme-contrast.test.ts:118-127` confirma paridade de tokens entre `:root`/`.dark` | ✅ PASS (nota: `src/shared/components/ui/sheet.tsx` tem `bg-black/10` no overlay, herdado do padrão shadcn já usado em `dialog.tsx` pré-existente — primitivo genérico, não "componente do shell" na acepção do design.md, e não é um par texto/fundo sujeito a AA) |
| SHELL-14: par texto/fundo cumpre AA (4.5:1 texto, 3:1 UI) nos dois temas, em todo estado | Toda razão de contraste ≥ piso, para os 16 pares listados × 2 temas | `src/app/__tests__/theme-contrast.test.ts:107-115` (33 testes: 32 pares + 1 completude) — todos passam; matemática Oklch→sRGB verificada independentemente (script Python, mesma fórmula de Ottosson) reproduzindo os mesmos ratios (ex.: `foreground/background` claro = 17.33:1) | ✅ PASS |
| SHELL-15: `<nav>` é landmark rotulado; itens alcançáveis por `Tab` com foco visível | Landmark com `aria-label`; todos os 5 itens tabuláveis, indicador de foco visível | `e2e/shell.spec.ts:118` — `getByRole("navigation",{name:"Navegação principal"})` visível (landmark ✅); implementação usa `<a href>` nativo + `focus-visible:ring-2 focus-visible:ring-sidebar-ring` em `app-shell.tsx:14` (NAV_LINK_CLASSES) — reachability e indicador de foco **não têm asserção e2e dedicada** (só a landmark é testada; o skip-link test em `:107` prova que Tab funciona na página, mas não itera os 5 itens do nav nem verifica o outline computado) | ⚠️ PASS com gap de cobertura — comportamento correto por semântica nativa de `<a>` + classe já usada em todo o projeto, mas sem teste comportamental dedicado |
| SHELL-16: skip link primeiro focável, move o foco ao conteúdo (não só rola) | `<main>` recebe foco programático (`toBeFocused`), não só fica visível | `app-shell.tsx:116` — `<main id="main-content" tabIndex={-1} ...>`; `e2e/shell.spec.ts:107-112` — `Tab` → skip link `toBeFocused()`; `Enter` → `page.locator("#main-content")).toBeFocused()` (não apenas `toBeVisible`) | ✅ PASS |
| SHELL-17: nome longo trunca com ellipsis sem quebrar layout | Overflow controlado (`scrollWidth > clientWidth`), largura da sidebar dentro do esperado | `app-shell.tsx:56` — classe `truncate`; `e2e/shell.spec.ts:130-136` — `overflowsContainer` (scrollWidth>clientWidth) `toBe(true)`; `asideBox.width < 400` | ✅ PASS |
| SHELL-18: sem preferência salva, tema segue `prefers-color-scheme` | Classe `dark` no `<html>` refletindo `colorScheme` emulado, sem sessão | `e2e/theme.spec.ts:58-76` (`colorScheme:"dark"` → classe `dark` presente); `:78-92` (`colorScheme:"light"` → ausente) | ✅ PASS |
| SHELL-19: seleção no toggle muda o tema imediatamente, sem reload | Classe muda sem navegação (URL inalterada) | `e2e/theme.spec.ts:126-141` — `hasDarkClass` muda, `page.url() === urlBefore` | ✅ PASS |
| SHELL-20: preferência salva aplicada no primeiro paint após reload, sem flash | Classe já correta imediatamente após `page.reload()` (sem espera), zero warnings de hidratação no console | `e2e/theme.spec.ts:161-170` — `hasDarkClass` correto logo após `reload()`, `aria-pressed` correto, `consoleErrors.filter(/hydrat/i)` vazio | ✅ PASS |
| SHELL-21: controle de tema com rótulo acessível e opção ativa exposta | `role="group"` com `aria-label`; opção ativa com `aria-pressed="true"` | `e2e/theme.spec.ts:103-114` — grupo "Tema" visível, 3 botões nomeados, "Sistema" com `aria-pressed="true"` quando é o padrão | ✅ PASS |

**Status**: ✅ 20/21 ACs full-evidence PASS; 1 (SHELL-15) PASS with a coverage gap flagged (behavior correct by implementation/native semantics, but no dedicated e2e assertion for tab-reachability of the 5 nav items / computed focus-visible style).

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/app/app/_lib/nav.ts:29` | `pathname.startsWith(\`${item.href}/\`)` → `pathname.startsWith(item.href)` (removed segment-boundary slash) | ✅ Killed — `nav.test.ts` "rota com prefixo textual mas sem fronteira de segmento não ativa a seção" fails (`/app/commitments-extra` wrongly activates) |
| 2 | `src/app/globals.css:74` | `--muted-foreground: oklch(0.48 0.02 250)` → `oklch(0.85 0.02 250)` (light theme, breaks AA) | ✅ Killed — `theme-contrast.test.ts` 2 assertions fail (ratio 1.51/1.58 vs required 4.5) — confirms the test reads the real file at runtime, not a hardcoded copy |
| 3 | `src/app/app/_components/theme-toggle.tsx:49` | `mounted && theme === option.value` → `theme === option.value` (removed hydration-safety guard) | ✅ Killed — `e2e/theme.spec.ts` "preferência persiste após reload..." fails (`aria-pressed` never becomes `true` post-reload within timeout) — confirms the `useSyncExternalStore` guard is load-bearing, not just silencing a lint rule |

All mutations applied to a clean working tree, one at a time, tests re-run, then reverted with `git checkout --`; tree confirmed clean (`git status --porcelain` empty) before and after.

**Sensor depth**: lightweight (3 targeted mutations, default tier)
**Result**: 3/3 killed — PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — each task is a single cohesive file/concern (per Task Granularity Check in tasks.md) |
| Surgical changes | ✅ — T8's 4-page edit is a 1-line class swap per file (`bg-zinc-50 dark:bg-black` → `bg-background`); T5's dashboard edit removes exactly the duplicated `LogoutButton` |
| No scope creep | ⚠️ noted, not a fail — T9 fixed a pre-existing, self-referential `--font-sans: var(--font-sans)` bug (site-wide font fallback) while carbonizing DESIGN.md. Disclosed explicitly in the T9 commit and STATE.md ("Achado fora do escopo original mas corrigido nesta feature"); justified as touching the one file this feature already owns (SHELL-13); gate stayed green. Reasonable call, but a font-rendering regression fix arguably deserved its own atomic commit/PR for a cleaner bisect trail |
| Matches patterns | ✅ — `_lib` pure-helper pattern mirrors `merge-category-spending`; shell reuses existing `LogoutButton`/`auth.api.getSession` public API; Sheet vendored with zero customization beyond project's existing shadcn primitives (`bg-black/10` overlay matches pre-existing `dialog.tsx`) |
| Spec-anchored outcome check | ✅ — see AC table above; all assertions target the exact spec-defined outcome (aria-current count, URL regex, class presence, aria-pressed value), not just "something is visible" |
| Per-layer Coverage Expectation met | ✅ — domain-equivalent layer (`_lib/nav.ts`) has 1:1 unit coverage incl. all edges from the Test Coverage Matrix; e2e covers happy+edge+error for every new route/flow in scope (desktop nav, mobile drawer, theme) |
| Every test maps to a spec requirement | ✅ — every unit/e2e test file inspected cites a SHELL-* id in a comment or describe block; no unclaimed tests found |
| Documented guidelines followed | `AGENTS.md`, `docs/TESTING.md` (env/gate conventions) — followed; project a11y/testing conventions (role-based Playwright locators, `focus-visible` utility classes) — followed |

**Dark-mode audit scope (T8)** — confirmed legitimate: spec.md explicitly scopes "Restyling das páginas internas" out of this feature (line 24, deferred to roadmap item 9 `app-polish`), and design.md's own Risks table frames T8 as "corrige só ilegibilidade". Grep confirms numerous `text-gray-*`/`bg-white dark:bg-gray-800`/etc. remain untouched in `src/modules/*/components/` — consistent with the disclosed, narrower scope (4 pages, 1 bad hardcoded pair: `bg-zinc-50 dark:bg-black`), not an incomplete fix passed off as done.

**Pre-existing e2e selector fix (`.first()`)** — confirmed legitimate disambiguation, not a weakened assertion: `src/app/app/page.tsx:49` still renders `"Bem-vindo ao Prumo"` next to the dashboard's own greeting containing the user's name, and the shell (`app-shell.tsx:56`) now also renders the name in the sidebar — two independent, both-correct occurrences of the same text on `/app`. `.first()` narrows to either match; the assertion still fails if the name is absent from both.

---

## Edge Cases

- [x] Sub-rota futura de seção mantém item ativo (`/app/commitments/123`) — `nav.test.ts:38-41`, e2e `nav.test.ts:57-61`
- [x] Sessão expira durante navegação → guard redireciona (coberto por SHELL-07, sem teste dedicado adicional, conforme spec)
- [x] JS não hidratado → links funcionam nativamente (`<a href>` real via `next/link`, não `<button onClick>`) — verificado no código (`app-shell.tsx:37`, `Link href=...`)
- [x] "Sistema" ativo + mudança do SO → tema acompanha sem reload — `e2e/theme.spec.ts:175-197`
- [x] Nome do usuário maior que a largura disponível → truncate com ellipsis — `e2e/shell.spec.ts:121-137`

---

## Gate Check

- **Gate command**: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build`
- **Result**: all green — lint 0 errors (10 pre-existing warnings, unrelated to this feature's files); typecheck clean; 193 unit passed; 156 integration passed; 39 e2e passed; build succeeded
- **Test count before feature**: 149 unit / 156 integration / 22 e2e
- **Test count after feature**: 193 unit / 156 integration / 39 e2e
- **Delta**: +44 unit (16 in `nav.test.ts`, plus contrast tests bring the total; see below), +0 integration (feature doesn't touch `data/`/`actions/`, as declared in spec.md's Testes previstos), +17 e2e (6 shell desktop, 5 drawer mobile, 6 theme)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

None required to pass. One optional follow-up noted for the routing team (not blocking):

### Optional: strengthen SHELL-15 e2e coverage

- **Root cause**: `e2e/shell.spec.ts` asserts the `<nav>` landmark is visible and labeled, but does not iterate `Tab` through all 5 nav items nor assert a computed focus-visible outline; only the skip link's Tab-reachability is asserted.
- **Fix task** (optional, low priority): add an e2e assertion that repeatedly presses `Tab` from the skip link through the 5 nav items, asserting each receives focus in order (`toBeFocused()` per item) and/or a computed-style check for the focus ring on the currently focused item.
- **Priority**: Minor (implementation is already correct via native `<a>` semantics + the project-wide `focus-visible:ring-2` convention; this is a coverage-depth gap, not a functional defect).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status  |
| ----------- | ---------------- | ----------- |
| SHELL-01 | Implementing | ✅ Verified |
| SHELL-02 | Implementing | ✅ Verified |
| SHELL-03 | Implementing | ✅ Verified |
| SHELL-04 | Implementing | ✅ Verified |
| SHELL-05 | Implementing | ✅ Verified |
| SHELL-06 | Implementing | ✅ Verified |
| SHELL-07 | Implementing | ✅ Verified |
| SHELL-08 | Implementing | ✅ Verified |
| SHELL-09 | Implementing | ✅ Verified |
| SHELL-10 | Implementing | ✅ Verified |
| SHELL-11 | Implementing | ✅ Verified |
| SHELL-12 | Implementing | ✅ Verified |
| SHELL-13 | Implementing | ✅ Verified |
| SHELL-14 | Implementing | ✅ Verified |
| SHELL-15 | Implementing | ✅ Verified (coverage gap noted above, not a functional defect) |
| SHELL-16 | Implementing | ✅ Verified |
| SHELL-17 | Implementing | ✅ Verified |
| SHELL-18 | Implementing | ✅ Verified |
| SHELL-19 | Implementing | ✅ Verified |
| SHELL-20 | Implementing | ✅ Verified |
| SHELL-21 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 21/21 ACs matched spec outcome (20 full-evidence, 1 with a disclosed coverage-depth gap that doesn't affect functional correctness)
**Sensor**: 3/3 mutations killed
**Gate**: all green (lint, typecheck, 193 unit, 156 integration, 39 e2e, build)

**What works**: Full navigation shell (desktop sidebar + mobile drawer) with correct single-active-item logic including segment-boundary edge cases; session/logout visible and functional from any `/app` page with the existing auth guard preserved; from-scratch Prumo theme tokens verified for WCAG AA in both themes via a genuine runtime CSS-parsing contrast test (independently re-derived and confirmed correct); dark mode with system-following default, instant toggle, and flash-free persistence backed by real hydration-safety code (not just a lint workaround) and a real console-error e2e assertion; skip link that moves programmatic focus, not just scroll.

**Issues found**: SHELL-15's "reachable by Tab with visible focus" sub-claim lacks a dedicated e2e assertion (implementation is correct; see optional fix task above — not blocking).

**Next steps**: None required. Optional low-priority follow-up (SHELL-15 e2e depth) may be picked up opportunistically in a future shell-touching feature.
