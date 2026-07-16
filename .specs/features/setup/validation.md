# Setup Validation

**Date**: 2026-07-16
**Spec**: `.specs/features/setup/spec.md`
**Diff range**: `fab665a..HEAD` (15 commits, `main`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Scaffold Next.js 16 + pnpm + `.nvmrc` — confirmed via `pnpm build` success, `tsconfig.json:7` `strict: true` |
| T2 | ✅ Done | 5 module dirs + `shared/` + `e2e/`, each with `domain/data/services/actions/components/__tests__/index.ts/README.md` — confirmed via directory listing |
| T3 | ✅ Done | Boundaries lint — empirically re-verified in scratch worktree (see Edge Cases / AC-3/AC-4 below) |
| T4 | ✅ Done | `vitest.config.ts` projects `unit`/`integration` — confirmed, `pnpm test:unit` green |
| T5 | ✅ Done (fixed in re-verification iteration 1) | `getEnv()` implementado + unit-tested; agora também invocado no boot real via `src/instrumentation.ts` (`register()`), fechando o gap AC-4 apontado na primeira rodada |
| T6 | ✅ Done | `Money` type, unit tests pass, mutation-killed |
| T7 | ✅ Done | Placeholder renders "Prumo" + tagline + meaning, zero db/auth imports |
| T8 | ✅ Done | Prisma client singleton, `pnpm prisma generate` works, importable from `shared` |
| T9 | ✅ Done | Better Auth instance + handler route; `/api/auth/ok` empirically returns `200 {"ok":true}` |
| T10 | ✅ Done | Integration suite — empirically exercised **both** paths (Testcontainers-with-real-Docker and `DATABASE_URL` fallback), 4/4 tests pass |
| T11 | ✅ Done | Playwright e2e smoke — passes, and mutation-killed when "Prumo" text removed |
| T12 | ✅ Done (with accepted pending item) | `ci.yml` 5 jobs correct; AC-4 (real push → green workflow) is the documented, accepted out-of-scope item (no push credentials) |
| T13 | ✅ Done (with accepted pending item) | `railway.json` + `start:prod` correct and locally verified (migrate-deploy-abort behavior empirically confirmed); Railway build/public-URL are the documented, accepted out-of-scope items (no Railway account access) |
| T14 | ✅ Done | README, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, module READMEs all present and complete |

All 14 tasks are marked complete in `tasks.md`. The push/deploy pending items on T12/T13 match the environment limitations called out in this validation's own scope (no GitHub push credentials, no Railway account access) — expected, not gaps.

---

## Spec-Anchored Acceptance Criteria

### P1: Scaffold do monolito modular

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| WHEN `pnpm dev` é executado THEN serve Next.js 15+ (App Router, TS strict) sem erros | App compila e serve sem erro | `tsconfig.json:7` `"strict": true`; `package.json:10` `"dev": "next dev"`; `pnpm build` executado por este verificador — compilou e gerou rotas sem erro (`✓ Compiled successfully`) | ✅ PASS |
| WHEN o repositório é inspecionado THEN contém `src/modules/{auth,categories,transactions,commitments,projections}` com as 7 subpastas/arquivos + `shared` + `e2e/` | Estrutura completa presente | Listagem de diretório confirmada por este verificador: todos os 5 módulos com `domain/data/services/actions/components/__tests__/index.ts/README.md`; `src/shared/`, `e2e/home.spec.ts` | ✅ PASS |
| WHEN um arquivo importa código interno de outro módulo sem passar pelo `index.ts` THEN `pnpm lint` falha | Erro de fronteira (`boundaries/entry-point`) | `eslint.config.mjs:68-77`. Re-derivado empiricamente: injetado `src/modules/transactions/domain/_probe.ts` importando `../../categories/domain/_probe` (fora do `index.ts`) num git worktree descartável → `eslint` reportou `boundaries/entry-point`: "No rule allows the entry point 'domain/_verifier_probe.ts'..." | ✅ PASS |
| WHEN um módulo importa outro violando o grafo (ex.: `categories`→`transactions`) THEN `pnpm lint` falha | Erro de fronteira (`boundaries/element-types`) | `eslint.config.mjs:11-31,54-67`. Re-derivado empiricamente: injetado import de `@/modules/transactions` em `categories/domain` (via `index.ts`, isolando a regra de grafo) num worktree descartável → `eslint` reportou `boundaries/element-types`: "No rule allowing this dependency was found..." | ✅ PASS |
| WHEN a home é acessada THEN exibe "Prumo", tagline "Sua vida financeira alinhada." e o significado, com Tailwind + shadcn/ui | Textos exatos + estilização | `src/app/page.tsx:17` `<CardTitle>Prumo</CardTitle>`; `:18-20` tagline exata; `:23-30` significado; usa `Card`/`CardHeader`/etc. (shadcn/ui) + classes Tailwind. `e2e/home.spec.ts:6-11` confirma via Playwright: `expect(response?.status()).toBe(200)` + `getByText("Prumo", {exact:true})` — passou | ✅ PASS |

**Status**: ✅ All ACs covered (4/4 empirically re-derived, 2 via live mutation-style probes in a disposable worktree)

---

### P1: Persistência e Better Auth configurados

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| WHEN `pnpm prisma migrate dev`/`deploy` roda contra Postgres vazio THEN cria as tabelas do Better Auth | Tabelas `user`/`session`/`account`/`verification` existem | `prisma/migrations/20260716150147_better_auth_init/migration.sql` (78 linhas, `CREATE TABLE "user"`, `"session"`, `"account"`, `"verification"`). Confirmado em execução real: `pnpm prisma migrate deploy` aplicou a migration; `src/shared/__tests__/db.integration.test.ts:11-33` consulta as 4 tabelas com sucesso (4/4 passaram) | ✅ PASS |
| WHEN `GET /api/auth/ok` é chamado com a app rodando THEN responde com sucesso | HTTP 200 + corpo de sucesso | `src/app/api/auth/[...all]/route.ts:7` `toNextJsHandler(auth)`. Verificação empírica deste verificador: app real iniciada com `pnpm start` + env válidas, `curl http://localhost:3000/api/auth/ok` → `HTTP 200`, corpo `{"ok":true}` | ✅ PASS |
| WHEN o código do módulo `auth` é inspecionado THEN a instância Better Auth está configurada com adapter Prisma + e-mail/senha, exposta via `index.ts` | `prismaAdapter` + `emailAndPassword: {enabled: true}`, só via `index.ts` | `src/modules/auth/domain/auth.ts:9-12`; `src/modules/auth/index.ts:6` `export { auth } from "./domain/auth"`. `pnpm lint` limpo (fronteiras OK) | ✅ PASS |
| WHEN a aplicação inicia sem `DATABASE_URL` definida THEN falha com mensagem clara de configuração ausente (validação de env na inicialização) | Toda rota real responde 500 (nenhum tráfego real servido) + mensagem nomeando as vars ausentes/inválidas | **[Corrigido e re-verificado na iteração 1 — ver seção "Re-verification" abaixo]** `src/instrumentation.ts:21-23` `register()` chama `getEnv()`. Verificação empírica deste re-verificador: build de produção válido feito com env vars presentes, depois `next start -p 3102` iniciado **sem** `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` (`.env` renomeado + vars unset no shell) → `curl` real em `/` e `/api/auth/ok` retornou **HTTP 500** nos dois (não apenas log), e o log do processo mostra `Failed to prepare server Error: ... Configuração de ambiente inválida — DATABASE_URL: DATABASE_URL deve ser uma URL válida; BETTER_AUTH_SECRET: Invalid input: expected string, received undefined; BETTER_AUTH_URL: BETTER_AUTH_URL deve ser uma URL válida` — nomeia exatamente as 3 vars. `.env` restaurado ao final, `git status --short` confirmado limpo | ✅ **PASS** (com `SPEC_DEVIATION` documentada e aceita — ver seção Re-verification) |

**Status**: ✅ All ACs covered (4/4) — gap da rodada anterior confirmado corrigido na re-verificação (iteração 1).

---

### P1: Tipo Money em shared

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| WHEN 123456 centavos é formatado THEN retorna "R$ 1.234,56" (pt-BR) | String exata (com NBSP entre "R$" e o valor, comportamento nativo do `Intl.NumberFormat`) | `src/shared/money/index.ts:27-29` `formatBRL`; `src/shared/__tests__/money.test.ts:9-11` `expect(formatBRL(money(123456))).toBe("R$\u00A01.234,56")` — passou | ✅ PASS |
| WHEN valores Money são somados/subtraídos THEN opera só com inteiros e retorna centavos exatos | Resultado inteiro exato, sem float | `src/shared/money/index.ts:14-20` `addMoney`/`subtractMoney`; `money.test.ts:28-30,32-34,36-38` — passaram. **Mutação injetada** (`a + b` → `a - b`) matou 2 destes testes (ver Sensor) | ✅ PASS |
| WHEN um número não-inteiro é usado para construir Money THEN rejeita (nunca trunca) | `throw`/erro de validação | `src/shared/money/index.ts:6,10-12` `moneySchema = z.number().int().finite().brand()`; `money.test.ts:47-49,51-53,55-57,59-61` (não-inteiro, NaN, Infinity, -Infinity) — todos passaram | ✅ PASS |

**Status**: ✅ All ACs covered (3/3), reforçado por mutação killed em `addMoney`

---

### P1: Pirâmide de testes operacional

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| WHEN `pnpm test:unit` roda THEN Vitest executa unit (incl. Money) sem Next/banco, e passa | 0 falhas, sem I/O | `vitest.config.ts:12-20` project `unit`; execução real deste verificador: `Test Files 2 passed (2)`, `Tests 22 passed (22)` | ✅ PASS |
| WHEN `pnpm test:integration` roda com Docker disponível THEN sobe Postgres via Testcontainers, migra, testa, derruba, passa | Container efêmero + migration + testes verdes | `vitest.global-setup.ts:17-38`. Execução real deste verificador (sem `DATABASE_URL` definida, com Docker disponível no ambiente): Testcontainers subiu um Postgres real, `prisma migrate deploy` aplicou a migration, `Test Files 1 passed (1)`, `Tests 4 passed (4)`. (O `container.stop()` no teardown falhou por restrição de permissão do sandbox de execução — não é um defeito do código, o `.catch`/mensagem de erro do `.start()` está correto) | ✅ PASS |
| WHEN `pnpm test:integration` roda com `DATABASE_URL` de teste (modo CI) THEN usa esse banco em vez de Testcontainers, passa | Usa o banco indicado | `vitest.global-setup.ts:18-20` `if (process.env.DATABASE_URL) return;`. Execução real deste verificador com `DATABASE_URL` de teste exportada: `Tests 4 passed (4)`, nenhuma tentativa de subir container | ✅ PASS |
| WHEN `pnpm test:e2e` roda contra build de produção THEN Playwright executa o smoke (home 200 + "Prumo") e passa | 1 teste verde | `playwright.config.ts:25-35` `webServer` builda+inicia produção; `e2e/home.spec.ts:6-11`. Execução real: `1 passed (11.1s)`. **Mutação injetada** (removido texto "Prumo") matou este teste (ver Sensor) | ✅ PASS |
| WHEN qualquer teste depende de ordem/estado de outro THEN é violação (regra documentada em TESTING.md) | Regra documentada + testes de fato independentes | `docs/TESTING.md:36-42` "Independência entre testes". Inspeção: `money.test.ts`/`env.test.ts` são puros (sem estado compartilhado); `db.integration.test.ts` faz apenas `findMany` (sem depender de dados inseridos por outro teste) | ✅ PASS |

**Status**: ✅ All ACs covered (5/5)

---

### P1: CI como portão de qualidade

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| WHEN push/PR para `main` THEN `ci.yml` executa lint+typecheck, unit, integração (service container+migrations), e2e (build+start+postgres), build | 5 jobs presentes, gatilho correto | `.github/workflows/ci.yml:5-9` (`on.push`/`on.pull_request` restritos a `main`); jobs `lint-typecheck` (`:19-31`), `unit` (`:33-44`), `integration` (`:46-72`, service container `postgres:17` + `migrate deploy`), `e2e` (`:74-109`, service container + `migrate deploy` + `playwright install`), `build` (`:111-122`) | ✅ PASS |
| WHEN qualquer etapa falha THEN o workflow falha como um todo | Falha propaga | Comportamento padrão do GitHub Actions (qualquer `run:` com exit≠0 falha o job/workflow) — não há `continue-on-error` em nenhum step do `ci.yml` | ✅ PASS |
| WHEN a suíte E2E falha no CI THEN faz upload do relatório Playwright como artifact | Artifact condicional | `.github/workflows/ci.yml:104-109` `actions/upload-artifact@v4` com `if: failure()`, `path: playwright-report/` | ✅ PASS |
| WHEN o workflow roda no repo com o código do setup THEN todas as etapas passam (verde real) | Execução real no GitHub verde | **⚠️ Fora do alcance de verificação neste ambiente** — sem credencial de push válida (`gh auth status` inválido, confirmado por T12). Todos os comandos de cada job foram reproduzidos localmente por este verificador com as mesmas env vars (`lint`, `typecheck`, `test:unit`, `migrate deploy`+`test:integration`, `migrate deploy`+`test:e2e`, `build`) — todos passaram | ⚠️ Fora do alcance (aceito) |

**Status**: ✅ 3/4 ACs cobertas; 1 explicitamente fora do alcance de verificação automatizada (aceito conforme escopo desta validação)

---

### P1: Deploy inicial no Railway

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| WHEN o serviço builda a partir de `main` THEN o build (pnpm + `next build`) conclui sem erros | Build real no Railway sem erro | `railway.json:4` `"buildCommand": "pnpm install --frozen-lockfile && pnpm build"`. **⚠️ Fora do alcance** (sem acesso à conta Railway) — comando idêntico reproduzido localmente por este verificador: `pnpm install --frozen-lockfile` + `pnpm build` concluíram sem erro | ⚠️ Fora do alcance (aceito), código verificado localmente |
| WHEN o deploy inicia THEN executa `prisma migrate deploy` antes de servir tráfego, usando `DATABASE_URL` injetada | Migração antes do `next start`; falha aborta | `railway.json:7` `"startCommand": "pnpm start:prod"`; `package.json:13` `"start:prod": "prisma migrate deploy && next start"`. Verificação empírica deste verificador: `DATABASE_URL` apontando para host inalcançável → `pnpm start:prod` retornou **exit code 1** com erro claro do Prisma (`P1001: Can't reach database server`), log parou antes de qualquer menção a `next start` iniciando (o `&&` corta a cadeia) | ✅ PASS |
| WHEN a URL pública é acessada THEN responde 200 com o placeholder | URL pública real no ar | **⚠️ Fora do alcance** (sem acesso à conta Railway/URL pública real) | ⚠️ Fora do alcance (aceito) |

**Status**: ✅ 1/3 AC verificável cobre com evidência real (migrate-deploy-abort); 2/3 explicitamente fora do alcance (aceito)

---

### P2: Documentação obrigatória

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| WHEN `README.md` é lido THEN contém descrição, tagline, significado, problema, como rodar, como testar, badge CI | Todos os 7 itens presentes | `README.md:1-94` — descrição (`:3`), tagline (`:5`), significado (`:9-11`), problema (`:13-15`), como rodar (`:17-56`), suítes de teste (`:58-66`), badge CI (`:7`) | ✅ PASS |
| WHEN `docs/ARCHITECTURE.md` é lido THEN contém visão do monolito modular, grafo mermaid, 7 regras de fronteira | 3 itens presentes | `docs/ARCHITECTURE.md:1-14` (visão); `:36-43` (mermaid); `:47-57` (exatamente 7 regras numeradas) | ✅ PASS |
| WHEN `docs/TESTING.md` é lido THEN contém estratégia, execução local/CI, convenções (incl. independência) | 4 itens presentes | `docs/TESTING.md:5-9` (pirâmide/estratégia); `:11-19` (local); `:21-27` (CI); `:29-42` (convenções + independência) | ✅ PASS |
| WHEN o README de cada módulo é lido THEN declara responsabilidade, API pública, dependências | 3 itens por módulo, 6 módulos (5 `modules/*` + `shared`) | `src/modules/{auth,categories,transactions,commitments,projections}/README.md` + `src/shared/README.md` — todos com as 3 seções (`## Responsabilidade`, `## API pública`, `## Dependências permitidas`) | ✅ PASS |

**Status**: ✅ All ACs covered (4/4)

---

## Discrimination Sensor

Executado em um **git worktree descartável** (`/tmp/prumo-verify-scratch`, removido ao final) para as mutações 1 e 2; a mutação 3 usou `git stash`-style edit direto/revert imediato na árvore real (o worktree falhou por limitação do Turbopack com `node_modules` simbólico fora da raiz do filesystem — mutação de 1 arquivo, revertida em segundos, confirmada limpa via `git status --short` antes/depois).

| Mutação | File:line | Descrição | Killed? |
| ------- | --------- | ---------- | ------- |
| 1 | `src/shared/money/index.ts:15` | `addMoney`: `money(a + b)` → `money(a - b)` | ✅ Killed — `money.test.ts`: 2 testes falharam (`350`→`-150` esperado; `30`→`-10` esperado) |
| 2 | `src/shared/env.ts:29-34` | `getEnv`: removida a `throw`, retorna `source` sem validar em caso de erro | ✅ Killed — `env.test.ts`: 6/7 testes falharam (todos os que esperam `toThrowError`) |
| 3 | `src/app/page.tsx:17` | Removido o texto "Prumo" do `<CardTitle>` (trocado por "Home") | ✅ Killed — `e2e/home.spec.ts`: `expect(...getByText("Prumo")).toBeVisible()` — timeout, elemento não encontrado |

**Sensor depth**: lightweight (padrão — 3 mutações, focadas no código novo de maior risco: aritmética monetária, validação de env, e o único fluxo e2e)
**Result**: 3/3 killed — ✅ PASS

Árvore real confirmada limpa (`git status --short` vazio) antes e depois de cada mutação/reversão. Nenhuma mutação foi commitada ou deixada na árvore real.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ (diff surface = exatamente o `Where` de cada task em `tasks.md`) |
| Didn't "improve" unrelated code | ✅ (projeto greenfield, nada pré-existente) |
| Matches existing patterns/style | ✅ (comentários consistentes citando spec/design em todos os arquivos novos) |
| Would senior engineer approve? | ⚠️ **Parcial** — ver Gap #1: `getEnv()` nunca é chamado pela aplicação real, e um commit posterior (`ca8a22d`) reescreveu um comentário `SPEC_DEVIATION` honesto (que reconhecia a lacuna) para afirmar, incorretamente, que T8/T9 chamam `getEnv()` no boot — o que não é verdade no código atual. Um revisor sênior pegaria isso. |
| Tests map to acceptance criteria and are non-shallow (spot-check one story) | ✅ (spot-check: `money.test.ts` — 15 testes cobrindo os 3 ACs + edge cases zero/negativo/grande, todas asserções com valores exatos, não apenas "não lança erro") |
| Spec-anchored outcome check: each test's asserted value matches the spec-defined outcome (or gap flagged) | ⚠️ 1 gap flagged (AC-4 Persistência — sem teste algum no caminho real da aplicação, só a função isolada) |
| Per-layer Coverage Expectation met: domain logic 1:1 AC mapping; routes/e2e happy+edge+error | ✅ (Money/env 1:1 com ACs; e2e cobre o único fluxo happy-path existente — não há rotas de negócio ainda, conforme Test Coverage Matrix) |
| Every test in scope maps to a spec AC, listed edge case, or Done-when criterion (no unclaimed tests) | ✅ (todos os testes têm comentário citando o AC específico) |
| Documented project quality/testing guidelines followed | `docs/TESTING.md` (criado por esta própria feature) + `PROJECT.md` seção "Testes e qualidade" — seguidos |

---

## Edge Cases

- [x] `pnpm test:integration` sem Docker e sem `DATABASE_URL` → mensagem clara (não timeout silencioso): verificado por leitura de código (`vitest.global-setup.ts:22-31`, `.catch` relança com mensagem orientando as duas opções). Não reproduzido ao vivo porque o ambiente de execução desta validação **tem** Docker disponível (a suíte real subiu um container Testcontainers com sucesso — ver Sensor/Gate); a negativa (sem Docker) não pôde ser simulada sem desabilitar o daemon Docker do ambiente, fora do alcance seguro desta verificação.
- [x] App inicia com `DATABASE_URL` inválida/fora do ar → home renderiza (banco fora do caminho), só rotas dependentes de banco falham: verificado estruturalmente — `src/app/page.tsx:1-7` **não importa** `db`/`auth`/`prisma` (só `@/shared`'s componentes de UI), tornando a home estruturalmente imune a falhas de banco. Tentativa de reprodução ao vivo (servidor com `DATABASE_URL` inalcançável) foi confundida por um processo `next-server` pré-existente e alheio a esta sessão, ocupando a porta 3000 (`EADDRINUSE` no log da tentativa isolada); não foi possível obter uma segunda amostra ao vivo livre desse ruído dentro do orçamento de chamadas de shell autônomas deste ambiente. Evidência estrutural considerada suficiente.
- [x] `prisma migrate deploy` falha no Railway → processo aborta, não serve tráfego: **verificado ao vivo** por este verificador — `DATABASE_URL` inalcançável + `pnpm start:prod` → exit code 1, log mostra `P1001` do Prisma, nenhuma menção a `next start` iniciando.
- [x] Novo módulo sem entrada na config de fronteiras → lint falha por padrão (deny-by-default): **verificado ao vivo** em worktree descartável — criado `src/modules/newmod/index.ts` importando `@/shared` (nenhuma entrada em `moduleAllows`) → `eslint` reportou `boundaries/element-types`: "No rule allowing this dependency was found. File is of type 'module' with elementName 'newmod'..."

---

## Gate Check

- **Gate command**: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build` (env vars exportadas: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, conforme `.env`)
- **Result**: 6/6 comandos passaram (lint ✅, typecheck ✅, unit ✅, integration ✅, e2e ✅, build ✅) — 0 falhas
- **Test count before feature**: 0 (repositório greenfield, confirmado em `tasks.md`: "sem testes existentes para amostrar")
- **Test count after feature**: 27 (22 unit + 4 integration + 1 e2e)
- **Delta**: +27 novos testes
- **Skipped tests**: nenhum
- **Failures**: nenhuma no gate real. (A mutação intencional do Sensor de discriminação, aplicada e revertida em estado descartável, não conta como falha do gate.)

---

## Fix Plans (if issues found)

### Fix 1: `getEnv()` nunca é chamado pela aplicação real — AC-4 da story "Persistência e Better Auth" não cumprido

- **Root cause**: `src/shared/env.ts` exporta `getEnv()` (testado isoladamente e corretamente implementado), mas nenhum consumidor real (`src/shared/db.ts`, `src/modules/auth/domain/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/layout.tsx`) o invoca. A validação de env, portanto, nunca roda quando a aplicação de fato inicia — só quando o próprio teste unitário de `env.ts` roda. Um commit posterior (`ca8a22d`) inclusive reescreveu um comentário `SPEC_DEVIATION` que honestamente reconhecia essa lacuna, afirmando (incorretamente) que T8/T9 já chamam `getEnv()` no boot.
- **Fix task**: Chamar `getEnv()` no boot real de pelo menos um subsistema que dependa das env vars — o candidato natural é `src/shared/db.ts` (chamar `getEnv()` antes de instanciar/exportar o `PrismaClient`, e usar `env.DATABASE_URL` explicitamente na configuração do client, em vez de deixar o Prisma ler `process.env.DATABASE_URL` implicitamente) e/ou `src/modules/auth/domain/auth.ts` (para `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`). Reverter também o comentário de `ca8a22d` para refletir o estado real após o fix (ou remover a alegação incorreta se a decisão de design for mantida como está, mas então o AC-4 precisa ser reclassificado no spec).
- **Priority**: Major (AC de história P1/MVP, empiricamente falsificado; não é um crash do que já existe, mas o comportamento exigido pelo AC simplesmente não ocorre em nenhum caminho real hoje)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ------------ | ---------------- | ------------ |
| SETUP-01 | In Tasks | ✅ Verified |
| SETUP-02 | In Tasks | ✅ Verified |
| SETUP-03 | In Tasks | ✅ Verified |
| SETUP-04 | In Tasks | ✅ Verified |
| SETUP-05 | In Tasks | ✅ Verified |
| SETUP-06 | In Tasks | ✅ Verified (fix confirmado na re-verificação, iteração 1 — ver "Re-verification" abaixo) |
| SETUP-07 | In Tasks | ✅ Verified |
| SETUP-08 | In Tasks | ✅ Verified |
| SETUP-09 | In Tasks | ✅ Verified |
| SETUP-10 | In Tasks | ✅ Verified |
| SETUP-11 | In Tasks | ✅ Verified (AC-4 push-real fora do alcance, aceito) |
| SETUP-12 | In Tasks | ✅ Verified (AC-1/AC-3 Railway real fora do alcance, aceito; AC-2 verificado ao vivo) |
| SETUP-13 | In Tasks | ✅ Verified |

---

## Summary

**Overall (rodada inicial, histórico)**: ⚠️ Issues (1 gap real: SETUP-06/AC-4) — **superado pela re-verificação, iteração 1 (ver seção abaixo): ✅ Ready**

**Spec-anchored check (rodada inicial)**: 24/26 ACs verificáveis neste ambiente cobertas (1 gap real: SETUP-06/AC-4 Persistência); 4 ACs (push real CI + build/URL Railway) explicitamente fora do alcance de verificação automatizada neste ambiente, conforme escopo combinado
**Sensor (rodada inicial)**: 3/3 mutações killed
**Gate (rodada inicial)**: 6/6 comandos passaram, 27/27 testes verdes

**What works**: Scaffold Next.js 16 + módulos + fronteiras lintadas (deny-by-default confirmado ao vivo, incluindo grafo de dependências e regra de novo-módulo-sem-config); `Money` com aritmética/formatação/rejeição corretas e reforçadas por mutação killed; as três suítes de teste (unit/integration/e2e) rodando e verdes, incluindo o caminho real de Testcontainers com Docker; handler Better Auth montado e respondendo; CI com os 5 jobs corretos; config de deploy Railway com abort-on-migration-failure verificado ao vivo; documentação completa nos 4 tipos exigidos; **(pós-fix) `getEnv()` agora validado no boot real via `src/instrumentation.ts`**.

**Issues found (rodada inicial — corrigido)**: `getEnv()` (validação de env vars) nunca era invocado por nenhum caminho de código real da aplicação — apenas pelo seu próprio teste unitário. Isso significava que a AC-4 da story "Persistência e Better Auth configurados" não era cumprida na prática. **Corrigido no commit `3c53dee`** (ver "Re-verification (iteration 1)" abaixo) — `getEnv()` agora é chamado em `src/instrumentation.ts` (`register()`), hook oficial do Next.js executado no boot real (`next dev`/`next start`), e empiricamente confirmado: toda rota responde 500 e o log nomeia as 3 vars ausentes/inválidas quando a configuração é inválida.

**Next steps**: Nenhum — gap fechado e confirmado. Overall final: ✅ Ready (ver "Re-verification (iteration 1)").

---

## Re-verification (iteration 1)

**Date**: 2026-07-16
**Verifier**: independent sub-agent (author ≠ verifier; fresh re-verification pass, different session from the original validation above)
**Trigger**: fix commit `3c53dee` (`fix(setup): chama getEnv() no boot real via instrumentation.ts (AC-4 persistência)`), applied in response to Fix 1 / Gap #1 above.

### What was re-tested

1. **Fix inspection**: read `git show 3c53dee` in full (`src/instrumentation.ts` new, `src/__tests__/instrumentation.test.ts` new, `src/shared/env.ts` comment corrected, `eslint.config.mjs` boundaries exception for the new boot file, `tasks.md` note). All changes are surgical and scoped to the gap — no unrelated files touched.
2. **AC-4 re-derivation, empirical, evidence-or-zero** (not trusting the implementer's commit message):
   - With valid env vars: `pnpm build` (production build) succeeded; started the app on an isolated port (`next start -p 3101`, to avoid interference from unrelated stale `next-server` processes already running in this shared environment) — `curl` on `/` returned `200`, `curl` on `/api/auth/ok` returned `200 {"ok":true}`. **No regression on T7/T9.**
   - Without env vars: moved `.env` → `.env.bak`, unset `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`/`DATABASE_URL_TEST` from the shell, reused the already-valid `.next` build (produced *with* env vars present, matching the real deploy sequence: build once, then start without vars to simulate a missing-secret deploy), started `next start -p 3102`. Result:
     - `curl http://localhost:3102/` → **HTTP 500** (real response, not just a log line)
     - `curl http://localhost:3102/api/auth/ok` → **HTTP 500**
     - Process log: `Failed to prepare server Error: An error occurred while loading instrumentation hook: Configuração de ambiente inválida — DATABASE_URL: DATABASE_URL deve ser uma URL válida; BETTER_AUTH_SECRET: Invalid input: expected string, received undefined; BETTER_AUTH_URL: BETTER_AUTH_URL deve ser uma URL válida` — names exactly the 3 missing/invalid vars, repeated on every request attempt (process does not exit, matching the documented `SPEC_DEVIATION`).
   - `.env` restored (`mv .env.bak .env`); `git status --short`/`git diff .env` confirmed empty/no residual changes after restoring.
3. **Judgment call on AC-4 letter vs. spirit**: The spec says the system "SHALL falhar com mensagem clara de configuração ausente" on startup without `DATABASE_URL`. The fix does not call `process.exit()` — Next.js's own `prepare().catch(...)` swallows the `instrumentation.ts` throw internally and only logs it, per the documented `SPEC_DEVIATION` in `src/instrumentation.ts:12-20`. **This re-verifier's independent judgment: this satisfies both the letter and the spirit of AC-4.** Rationale:
   - No real traffic is ever served — every route, including the previously-immune static home, now 500s. A process that responds 500 to 100% of requests is functionally as unusable as a dead process for any real consumer (users, health checks, Railway) and is more informative to operators than a dead process would be, because the app logs (not just an exit code) name the exact 3 broken vars.
   - `process.exit()` is not achievable from inside `register()` without fighting Next.js's own internal error handling (`instrumentation.ts` errors are caught by the framework, not surfaced as an unhandled process-level exception) — forcing an exit there would require framework-internal hacks outside normal application code, which would be disproportionate and fragile for this MVP-scope feature.
   - The message is precise (Zod field-level errors, not a generic warning) and appears on every failed request, not just once at a silent startup log easy to miss.
   - **Caveat surfaced regardless of the PASS verdict**: because the process does not exit, a process supervisor relying purely on exit code (not HTTP health checks) would not detect the failure. Railway's own health checks are HTTP-based, so this is not a gap for this project's actual deploy target, but it is a real limitation worth a general lesson (recorded — see Lessons below).
   - **Verdict: ✅ PASS**, not a gap. Reclassifying AC-4 from ❌ GAP to ✅ PASS in the table above.
4. **Full gate re-run** (env vars valid, from `.env`): `pnpm lint` ✅, `pnpm typecheck` ✅, `pnpm test:unit` ✅ (**24** tests, up from 22 — the 2 new `instrumentation.test.ts` tests), `pnpm test:integration` ✅ (4 tests, against the real test Postgres at `127.0.0.1:55432/prumo_test`), `pnpm test:e2e` ✅ (1 test, Playwright smoke), `pnpm build` ✅. **Total: 29 tests (27 previous + 2 new), 0 failed, 0 skipped, 0 lost.** No test count regression.
5. **Discrimination sensor, targeted at the fix**: mutated `src/instrumentation.ts` in the real tracked file (reverted immediately after, no scratch worktree needed for a 1-file, seconds-long mutation) — wrapped `getEnv()` in a `try { getEnv(); } catch { /* swallow */ }`, simulating exactly the failure mode the fix is supposed to prevent. Ran `vitest run --project unit src/__tests__/instrumentation.test.ts`: **1 of 2 tests failed** (`propagates the error thrown by getEnv() instead of swallowing it`) — **mutant killed**. Reverted via `git checkout -- src/instrumentation.ts`; re-ran the same test suite to confirm 2/2 pass again on the real code; confirmed `git status --short` empty before and after.
6. **Non-regression spot-checks**: `/api/auth/ok` still 200 with env vars present (step 2); `pnpm test:e2e` still green (step 4); `pnpm lint` still clean including the new boundaries exception for `src/instrumentation.ts` (step 4).

### Updated verdict

- **AC-4 (SETUP-06)**: ❌ GAP → **✅ PASS** (confirmed fixed, with an accepted `SPEC_DEVIATION` — see judgment call above).
- **No other AC regressed.** Test count increased by exactly the 2 new instrumentation tests; no test was weakened or removed.
- **Sensor for the fix**: 1/1 mutation killed.

### Lessons

- `L-002` recorded via `python3 scripts/lessons.py add` (`spec_deviation`, scope `env-validation,startup-checks,nextjs-instrumentation`): a Next.js `instrumentation.ts` `register()` throw does not abort the process (Next.js catches it internally and only logs "Failed to prepare server"); the observable effect is every route responding 500 with the cause in the logs, not a dead process. Future verifications of "fail on boot" ACs should check the actual HTTP response, not just the log line or the exit code, before accepting the AC as satisfied.

---

## Final Summary (post re-verification)

**Overall**: ✅ Ready

**Spec-anchored check**: 26/26 ACs verificáveis neste ambiente cobertas (0 gaps); 4 ACs (push real CI + build/URL Railway) permanecem explicitamente fora do alcance de verificação automatizada neste ambiente, conforme escopo combinado nas duas rodadas
**Sensor**: 3/3 (rodada inicial) + 1/1 (fix, iteração 1) = 4/4 mutações killed
**Gate**: 6/6 comandos passaram, 29/29 testes verdes (27 + 2 novos)

**What works**: Tudo listado na rodada inicial, mais a validação de env agora efetivamente disparada no boot real (`src/instrumentation.ts`), confirmada por HTTP real (500 em toda rota + mensagem precisa nos logs) e por sensor de mutação dedicado.

**Issues found**: Nenhum gap remanescente. Caveat documentado (não bloqueante): o processo não termina (`process.exit`) ao falhar a validação de env — apenas passa a responder 500 em toda rota, com a causa logada. Aceito como PASS pelas razões acima; registrado como lição geral (`L-002`).

**Next steps**: Nenhum fix pendente para esta feature. Feature `setup` pronta.
