# Setup do Projeto — Specification

**Feature:** `setup` (Roadmap item 1)
**Scope class:** Large (multi-componente: scaffold, banco, auth, lint, testes, CI, docs, deploy)
**Módulos tocados:** cria `src/modules/auth` (esqueleto + config Better Auth), `src/modules/{categories,transactions,commitments,projections}` (esqueletos vazios), `src/shared` (tipo `Money` + helpers BRL), `src/app` (página placeholder), `e2e/`. Nenhuma API pública de negócio é exposta ainda, exceto `shared` (Money) e `auth` (instância Better Auth).

## Problem Statement

O Prumo não tem uma linha de código: sem fundação técnica não há como desenvolver nenhuma feature de negócio com a disciplina definida (fronteiras de módulos, pirâmide de testes, CI como portão). Esta feature entrega o esqueleto executável do monolito modular, com qualidade reforçada por ferramentas desde o commit zero, e a aplicação no ar no Railway.

## Goals

- [ ] Projeto Next.js 15+ (App Router, TypeScript, pnpm) rodando localmente com `pnpm dev`
- [ ] Estrutura de módulos completa com fronteiras reforçadas por lint (violação quebra build)
- [ ] Prisma + PostgreSQL com schema do Better Auth migrado e handler de auth funcional
- [ ] Tipo `Money` (centavos) com helpers BRL em `shared`, coberto por testes unitários
- [ ] Suítes Vitest (unit + integração com Testcontainers) e Playwright configuradas e passando
- [ ] CI no GitHub Actions verde: lint+typecheck, unit, integração, E2E, build
- [ ] `README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md` e README por módulo
- [ ] Deploy no Railway: serviço `prumo` + PostgreSQL gerenciado, placeholder acessível publicamente

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| UI de cadastro/login/logout | Feature 2 (`auth`) do roadmap |
| Modelos Prisma de negócio (categorias, transações, compromissos) | Features 3-5; setup só migra o schema do Better Auth |
| Regras de negócio de qualquer módulo | Módulos são criados como esqueletos vazios com README |
| Componentes shadcn/ui além dos usados no placeholder | Adicionados sob demanda pelas features |
| Branch protection no GitHub | Recomendada no PROJECT.md, mas é configuração manual do repositório, não código; registrada como passo manual no README |
| Domínio customizado / HTTPS próprio no Railway | Subdomínio padrão do Railway basta para o MVP |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Gerenciador de pacotes | pnpm | Escolha do usuário (context.md) | y |
| Postgres p/ integração local | Testcontainers (fallback p/ `DATABASE_URL` no CI) | Escolha do usuário (context.md) | y |
| Better Auth no setup | Instalado + configurado (schema, migration, handler), sem UI | Escolha do usuário (context.md) | y |
| Deploy no Railway no setup | Sim, parte do "done" | Escolha do usuário (context.md) | y |
| Página inicial | Placeholder com identidade (nome, tagline, significado) | Escolha do usuário (context.md) | y |
| Plugin de lint de fronteiras | eslint-plugin-boundaries (ou import rules se inviável) | Agent's discretion (context.md); requisito é violação quebrar CI | n (discretion) |
| Node.js version | LTS atual (>=20), fixada em `.nvmrc`/`engines` e no CI | Compatibilidade Next.js 15 + Railway | n (assumption) |
| Migrations no deploy | `prisma migrate deploy` no start/release do Railway | Único processo (AD-006); migrations precisam rodar antes do app | n (assumption) |
| E2E no setup | 1 smoke test: home responde 200 e exibe "Prumo" | Não há fluxo de usuário ainda; valida pipeline Playwright de ponta a ponta | n (assumption) |
| Teste de integração no setup | 1 teste: conexão Prisma + tabelas do Better Auth existem pós-migration | Valida pipeline Testcontainers/service container sem inventar domínio | n (assumption) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Scaffold do monolito modular ⭐ MVP

**User Story**: Como desenvolvedor do Prumo, quero um projeto Next.js com a estrutura de módulos e fronteiras lintadas para que toda feature futura nasça dentro das regras arquiteturais.

**Why P1**: Tudo no roadmap depende desta estrutura; fronteiras sem lint degradam (AD-010).

**Acceptance Criteria**:

1. WHEN `pnpm dev` é executado THEN o sistema SHALL servir a aplicação Next.js 15+ (App Router, TypeScript strict) sem erros.
2. WHEN o repositório é inspecionado THEN o sistema SHALL conter `src/modules/{auth,categories,transactions,commitments,projections}` cada um com `domain/ data/ services/ actions/ components/ __tests__/ index.ts README.md`, além de `src/shared` e `e2e/`.
3. WHEN um arquivo importa código interno de outro módulo sem passar pelo `index.ts` THEN `pnpm lint` SHALL falhar com erro de fronteira.
4. WHEN um módulo importa outro violando o grafo permitido (ex.: `categories` importando `transactions`) THEN `pnpm lint` SHALL falhar.
5. WHEN a home é acessada THEN o sistema SHALL exibir placeholder com "Prumo", a tagline "Sua vida financeira alinhada." e o significado do nome, estilizado com Tailwind + shadcn/ui.

**Independent Test**: Rodar `pnpm dev`, abrir a home, ver o placeholder; adicionar um import ilegal e ver `pnpm lint` falhar.

---

### P1: Persistência e Better Auth configurados ⭐ MVP

**User Story**: Como desenvolvedor, quero Prisma + PostgreSQL e Better Auth prontos para que a feature de autenticação só precise construir UI e fluxos.

**Why P1**: Auth é a feature 2 e todo dado é escopado a usuário (AD-012); o schema de usuário precisa existir primeiro.

**Acceptance Criteria**:

1. WHEN `pnpm prisma migrate dev` roda contra um PostgreSQL vazio THEN o sistema SHALL criar as tabelas requeridas pelo Better Auth sem erro.
2. WHEN `GET /api/auth/ok` (ou endpoint equivalente do handler Better Auth) é chamado com a app rodando THEN o sistema SHALL responder com sucesso, provando que o handler está montado.
3. WHEN o código do módulo `auth` é inspecionado THEN a instância Better Auth SHALL estar configurada com adapter Prisma e provider e-mail/senha habilitado, exposta via `index.ts` do módulo.
4. WHEN a aplicação inicia sem `DATABASE_URL` definida THEN o sistema SHALL falhar com mensagem clara de configuração ausente (validação de env na inicialização).

**Independent Test**: Subir Postgres local, rodar migrations, iniciar app, chamar o endpoint do Better Auth e receber resposta de sucesso.

---

### P1: Tipo Money em shared ⭐ MVP

**User Story**: Como desenvolvedor, quero o tipo `Money` (inteiros em centavos) com formatação BRL em `shared` para que nenhuma feature futura manipule dinheiro com float.

**Why P1**: AD-008 — invariante financeira central; precisa existir antes de qualquer feature com valores.

**Acceptance Criteria**:

1. WHEN um valor de 123456 centavos é formatado THEN `shared` SHALL retornar "R$ 1.234,56" (pt-BR).
2. WHEN valores Money são somados/subtraídos via helpers THEN o sistema SHALL operar apenas com inteiros (sem ponto flutuante) e retornar centavos exatos.
3. WHEN um número não-inteiro é usado para construir Money THEN o sistema SHALL rejeitar (erro de validação Zod/construtor), nunca truncar silenciosamente.

**Independent Test**: Suíte unitária de Money passa, cobrindo formatação, aritmética e rejeição de não-inteiros.

---

### P1: Pirâmide de testes operacional ⭐ MVP

**User Story**: Como desenvolvedor, quero as três suítes (unit, integração, E2E) configuradas e passando para que toda feature futura apenas adicione testes, sem montar infraestrutura.

**Why P1**: AD-011 — testes são o portão de conclusão de toda feature; a infraestrutura precisa existir primeiro.

**Acceptance Criteria**:

1. WHEN `pnpm test:unit` roda THEN o Vitest SHALL executar os testes unitários (incluindo Money) sem Next.js nem banco, e passar.
2. WHEN `pnpm test:integration` roda localmente com Docker disponível THEN o sistema SHALL subir PostgreSQL via Testcontainers, aplicar migrations, executar a suíte e derrubar o container, passando.
3. WHEN `pnpm test:integration` roda com `DATABASE_URL` de teste definida (modo CI) THEN o sistema SHALL usar esse banco em vez de Testcontainers e passar.
4. WHEN `pnpm test:e2e` roda contra build de produção THEN o Playwright SHALL executar o smoke test (home responde 200 e contém "Prumo") e passar.
5. WHEN qualquer teste depende de ordem de execução ou estado de outro teste THEN a suíte SHALL ser considerada em violação (regra documentada em `docs/TESTING.md`).

**Independent Test**: Rodar os três comandos localmente, todos verdes.

---

### P1: CI como portão de qualidade ⭐ MVP

**User Story**: Como desenvolvedor, quero o workflow de CI completo no GitHub Actions para que nada chegue a `main` (e portanto ao Railway) sem passar por lint, typecheck, testes e build.

**Why P1**: AD-011 — CI verde é o único caminho para deploy.

**Acceptance Criteria**:

1. WHEN um push ou PR para `main` ocorre THEN o workflow `ci.yml` SHALL executar: lint (incluindo fronteiras) + `tsc --noEmit`, unit, integração (Postgres service container + migrations), E2E (Playwright contra `next build` + `next start` + Postgres de serviço) e `next build`.
2. WHEN qualquer etapa falha THEN o workflow SHALL falhar como um todo.
3. WHEN a suíte E2E falha no CI THEN o workflow SHALL fazer upload do relatório Playwright como artifact.
4. WHEN o workflow roda no repositório com o código do setup THEN todas as etapas SHALL passar (CI verde real, não teórico).

**Independent Test**: Abrir PR de teste e ver o workflow completo verde; forçar uma falha de lint e ver o workflow vermelho.

---

### P1: Deploy inicial no Railway ⭐ MVP

**User Story**: Como desenvolvedor, quero o Prumo no ar no Railway desde o início para que deploy nunca seja um evento arriscado de fim de projeto.

**Why P1**: Escolha explícita do usuário (context.md): setup só está "done" com a app no ar.

**Acceptance Criteria**:

1. WHEN o serviço `prumo` no Railway builda a partir de `main` THEN o build (pnpm + `next build`) SHALL concluir sem erros.
2. WHEN o deploy inicia THEN o sistema SHALL executar `prisma migrate deploy` antes de servir tráfego, usando a `DATABASE_URL` injetada do PostgreSQL gerenciado.
3. WHEN a URL pública do serviço é acessada THEN o sistema SHALL responder 200 com a página placeholder.

**Independent Test**: Acessar a URL pública do Railway e ver o placeholder do Prumo.

---

### P2: Documentação obrigatória

**User Story**: Como desenvolvedor (ou futuro colaborador), quero a documentação de arquitetura e testes para que as regras do projeto sejam descobríveis sem ler specs antigas.

**Why P2**: Obrigatória pelo PROJECT.md, mas não bloqueia tecnicamente as features seguintes.

**Acceptance Criteria**:

1. WHEN `README.md` é lido THEN ele SHALL conter descrição oficial, tagline, significado do nome, problema, como rodar localmente, como executar cada suíte de testes e badge de CI.
2. WHEN `docs/ARCHITECTURE.md` é lido THEN ele SHALL conter a visão do monolito modular, o grafo de dependências em mermaid e as 7 regras de fronteira.
3. WHEN `docs/TESTING.md` é lido THEN ele SHALL conter estratégia de testes, execução local e no CI, e convenções (incluindo independência entre testes).
4. WHEN o README de cada módulo é lido THEN ele SHALL declarar responsabilidade, API pública e dependências do módulo.

**Independent Test**: Checklist de conteúdo sobre os 4 tipos de documento.

---

## Edge Cases

- WHEN `pnpm test:integration` roda sem Docker e sem `DATABASE_URL` THEN o sistema SHALL falhar com mensagem clara explicando as duas opções (não timeout silencioso).
- WHEN a aplicação inicia com `DATABASE_URL` inválida/apontando para banco fora do ar THEN o placeholder SHALL ainda renderizar (a home não consulta banco) e apenas rotas dependentes de banco falham.
- WHEN `prisma migrate deploy` falha no Railway THEN o processo SHALL abortar o start (não servir tráfego com schema desatualizado).
- WHEN um novo módulo for adicionado no futuro sem entrada na config de fronteiras THEN o lint SHALL falhar por padrão (deny-by-default) em vez de permitir silenciosamente.

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Validação de env vars na inicialização (P1 Persistência AC-4); Money rejeita não-inteiros (P1 Money AC-3) |
| Failure / partial-failure states | Migration falha → start aborta (edge case); integração sem Docker → erro claro (edge case) |
| Idempotency / retry / duplicate handling | `prisma migrate deploy` é idempotente por design (Prisma). Demais: N/A because não há operações de escrita de negócio no setup |
| Auth boundaries & rate limits | N/A because não há endpoints de negócio; handler Better Auth usa defaults da lib, fluxos são a feature 2 |
| Concurrency / ordering | N/A because processo único (AD-006) e nenhuma operação concorrente de negócio existe ainda |
| Data lifecycle / expiry | N/A because só existem tabelas do Better Auth, cujo lifecycle (sessões) é gerenciado pela lib |
| Observability | Logs padrão do Next.js/Railway bastam para o MVP; N/A para métricas/tracing porque não há tráfego de negócio |
| External-dependency failure | Banco fora do ar: home continua servindo (edge case). N/A para outras deps porque não há chamadas externas |
| State-transition integrity | N/A because nenhuma máquina de estados de negócio existe no setup |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SETUP-01 | P1: Scaffold (Next.js + estrutura de módulos) | Done | Verified |
| SETUP-02 | P1: Scaffold (lint de fronteiras deny-by-default) | Done | Verified |
| SETUP-03 | P1: Scaffold (placeholder com identidade) | Done | Verified |
| SETUP-04 | P1: Persistência (Prisma + migration Better Auth) | Done | Verified |
| SETUP-05 | P1: Persistência (handler + instância Better Auth) | Done | Verified |
| SETUP-06 | P1: Persistência (validação de env) | Done | Verified |
| SETUP-07 | P1: Money (tipo + formatação BRL + aritmética inteira) | Done | Verified |
| SETUP-08 | P1: Testes (unit Vitest) | Done | Verified |
| SETUP-09 | P1: Testes (integração Testcontainers/DATABASE_URL) | Done | Verified |
| SETUP-10 | P1: Testes (E2E Playwright smoke) | Done | Verified |
| SETUP-11 | P1: CI (workflow completo verde) | Done | Verified |
| SETUP-12 | P1: Deploy (Railway + migrate deploy + URL pública) | Done | Verified |
| SETUP-13 | P2: Documentação (README, ARCHITECTURE, TESTING, READMEs de módulo) | Done | Verified |

**Coverage:** 13 total, 13 mapped to tasks (T1..T14), 0 unmapped ✅ — Verifier PASS em `.specs/features/setup/validation.md`; pendências de credencial (CI real, deploy Railway, branch protection) concluídas em 2026-07-16.

---

## Success Criteria

- [x] `pnpm dev` local funciona em uma máquina limpa seguindo apenas o README
- [x] `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm build` — tudo verde localmente
- [x] Workflow CI verde no GitHub em push para `main` (run 29521931576, 5/5 jobs)
- [x] URL pública do Railway responde 200 com o placeholder do Prumo (https://prumo.up.railway.app/)
- [x] Import ilegal entre módulos quebra o lint (demonstrável — verificado ao vivo pelo Verifier)
