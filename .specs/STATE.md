# STATE

## Decisions

### AD-001
- **Decision**: Stack TypeScript full-stack com Next.js 15+ (App Router) em monolito modular — um único deployável, módulos de domínio com fronteiras explícitas.
- **Reason**: Simplicidade operacional (1 serviço no Railway) com organização interna que permite evolução e testabilidade por módulo.
- **Trade-off**: Sem escala independente por módulo; disciplina de fronteiras depende de lint, não de processo separado.
- **Scope**: Todo o projeto.
- **Date**: 2026-07-15
- **Status**: active

### AD-002
- **Decision**: PostgreSQL com Prisma ORM como camada de persistência.
- **Reason**: Banco relacional maduro, gerenciado pelo Railway; Prisma dá tipagem forte alinhada ao TypeScript.
- **Trade-off**: Acoplamento ao Prisma na camada `data/`; migrations gerenciadas pelo Prisma.
- **Scope**: Toda a camada `data/` de todos os módulos.
- **Date**: 2026-07-15
- **Status**: active

### AD-003
- **Decision**: Zod em todos os contratos de entrada/saída; schemas Zod são a fonte de verdade dos contratos entre camadas.
- **Reason**: Validação em runtime + inferência de tipos estáticos a partir de uma única definição.
- **Trade-off**: Custo de validação em runtime nas fronteiras; schemas devem ser mantidos junto ao domínio.
- **Scope**: `domain/` (schemas) e `actions/` (validação na fronteira) de todos os módulos.
- **Date**: 2026-07-15
- **Status**: active

### AD-004
- **Decision**: UI com Tailwind CSS + shadcn/ui; gráficos com Recharts.
- **Reason**: Produtividade com componentes acessíveis e customizáveis; Recharts cobre os gráficos do dashboard sem dependência pesada.
- **Trade-off**: shadcn/ui copia componentes para o repositório (manutenção local).
- **Scope**: `components/` de todos os módulos e `src/shared`.
- **Date**: 2026-07-15
- **Status**: active

### AD-005
- **Decision**: Autenticação com Better Auth, e-mail/senha no MVP.
- **Reason**: Integração nativa com Next.js App Router e Prisma; escopo do MVP não exige OAuth.
- **Trade-off**: Provedores sociais e MFA ficam para fases futuras.
- **Scope**: Módulo `auth`.
- **Date**: 2026-07-15
- **Status**: active

### AD-006
- **Decision**: Deploy no Railway — 1 serviço web + PostgreSQL gerenciado, processo único, configurado via variáveis de ambiente injetadas (DATABASE_URL etc.).
- **Reason**: Menor atrito operacional para um monolito; banco gerenciado sem infraestrutura própria.
- **Trade-off**: Acoplamento leve ao modelo de env vars do Railway (mitigado por 12-factor config).
- **Scope**: Build, runtime e configuração do projeto.
- **Date**: 2026-07-15
- **Status**: active

### AD-007
- **Decision**: Identificador técnico `prumo` (minúsculo, sem acento) em repositório, package.json, banco de dados e serviço no Railway.
- **Reason**: Consistência de nomenclatura em todas as superfícies técnicas.
- **Trade-off**: Nenhum relevante.
- **Scope**: Nomenclatura de todo o projeto.
- **Date**: 2026-07-15
- **Status**: active

### AD-008
- **Decision**: Dinheiro nunca em float — valores monetários como inteiros em centavos (Int no Prisma). Tipo `Money` e helpers de formatação BRL (pt-BR) vivem em `shared` e são o único caminho para formatar/operar valores.
- **Reason**: Elimina erros de arredondamento de ponto flutuante em invariantes financeiras.
- **Trade-off**: Conversão explícita na apresentação; disciplina de nunca usar number "cru" para dinheiro.
- **Scope**: Todos os módulos que tocam valores monetários.
- **Date**: 2026-07-15
- **Status**: active

### AD-009
- **Decision**: Parcelas materializadas — compra parcelada gera registro pai (compromisso) + N registros filhos (parcelas) com vencimento e status próprios (prevista | paga). Diferença de centavos do arredondamento vai para a PRIMEIRA parcela; a soma das parcelas é sempre igual ao total (invariante com teste unitário).
- **Reason**: Parcelas com estado próprio (paga/prevista) exigem registros persistidos; cálculo on-the-fly não comporta status.
- **Trade-off**: Edição de compromissos precisa propagar para parcelas (afeta só futuras ou todas — decisão do usuário na UI).
- **Scope**: Módulo `commitments`; consumido por `projections`.
- **Date**: 2026-07-15
- **Status**: active

### AD-010
- **Decision**: Fronteiras de módulos reforçadas por lint (eslint-plugin-boundaries ou import rules); violação quebra build e CI. Grafo acíclico permitido: auth ← (todos); categories ← transactions, commitments; transactions, commitments ← projections; shared ← (todos). `projections` é somente-leitura sobre os demais. Import externo só via `index.ts` do módulo.
- **Reason**: Fronteiras que dependem só de convenção degradam; lint torna a arquitetura executável.
- **Trade-off**: Configuração de lint adicional a manter quando módulos mudam.
- **Scope**: Todos os módulos; CI.
- **Date**: 2026-07-15
- **Status**: active

### AD-011
- **Decision**: Pirâmide de testes obrigatória — unitários (Vitest) para `domain/` e `services/` sem Next.js nem banco; integração (Vitest + PostgreSQL real descartável) para `data/` e `actions/`; E2E (Playwright) para fluxos críticos contra a aplicação completa. CI no GitHub Actions (lint+typecheck, unit, integração com service container, E2E contra build de produção, build) como portão antes de qualquer deploy a partir de `main`.
- **Reason**: Cada camada da arquitetura tem a suíte que a cobre; CI verde é o único caminho para `main` → Railway.
- **Trade-off**: Pipeline mais longo; E2E exige manutenção de fixtures e banco de teste.
- **Scope**: Todas as features; CI.
- **Date**: 2026-07-15
- **Status**: active

### AD-012
- **Decision**: Isolamento por usuário — todo dado escopado ao usuário autenticado; repositórios em `data/` exigem `userId` como parâmetro obrigatório. Invariante coberta por teste de integração e por E2E com duas contas.
- **Reason**: Vazamento entre usuários é a falha de segurança mais grave do produto; o contrato dos repositórios torna impossível esquecer o escopo.
- **Trade-off**: Assinaturas de repositório mais verbosas.
- **Scope**: `data/` e `actions/` de todos os módulos.
- **Date**: 2026-07-15
- **Status**: active

### AD-013
- **Decision**: Next.js fixado na linha 16.x (Active LTS): Turbopack como bundler padrão, ESLint configurado diretamente (flat config, sem `next lint`), `proxy.ts` em vez de `middleware.ts`, request APIs sempre assíncronas (`await cookies()/headers()/params`), Node.js >= 20.9.
- **Reason**: 16.x é a linha estável atual (GA out/2025); começar em 15.x criaria migração obrigatória durante o MVP. PROJECT.md diz "15+", então conforma.
- **Trade-off**: Guias/tutoriais mais antigos assumem 15.x; convenções novas (caching explícito, proxy.ts) valem para todas as features.
- **Scope**: Todo o projeto.
- **Date**: 2026-07-16
- **Status**: active

## Handoff

- **Feature**: setup (Roadmap item 1) — ✅ Execute concluído, Verifier PASS
- **Phase / Task**: Todas as 4 fases (T1..T14) implementadas e commitadas; Fix 1 (AC-4/SETUP-06) aplicado e re-verificado. Nenhuma task pendente.
- **Completed**: Specify, Design, Tasks e Execute completos. 14 tasks commitadas (1 commit atômico por task, ver `git log`), Verifier independente rodou 2 iterações (1ª: FAIL com 1 gap — `getEnv()` nunca chamado no boot real; 2ª após fix: PASS). Relatório em `.specs/features/setup/validation.md`; lições candidatas L-001/L-002 em `.specs/LESSONS.md`.
- **In-progress** (file:line): nenhum
- **Next step**: Pendências que só o usuário pode executar (fora do alcance deste ambiente sandboxed): (1) `git push` para `origin/main` com credencial válida do GitHub (token do `gh auth` local está inválido) para disparar o CI real e confirmar o workflow verde (AC-4 da story CI); (2) criar o serviço `prumo` + PostgreSQL gerenciado no Railway, conectar o repositório, configurar `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` no painel e validar a URL pública (story "Deploy inicial no Railway"); (3) configurar branch protection recomendada no GitHub (documentado no README). Depois disso, feature `setup` 100% "done" e o roadmap pode avançar para a feature 2 (`auth` — UI de cadastro/login).
- **Blockers**: nenhum bloqueio técnico; as 3 pendências acima são de credencial/conta do usuário, não de código.
- **Uncommitted files**: nenhum (`git status` limpo em `main`, 17 commits ahead de `origin/main`, aguardando push do usuário)
- **Branch**: main
