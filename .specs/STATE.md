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

### AD-014
- **Decision**: Paths de URL da aplicação em inglês (`/signup`, `/login`, `/terms`, `/app`, etc.). Texto da UI permanece em pt-BR.
- **Reason**: Convenção única e estável para rotas técnicas; evita mistura `/termos` vs `/terms` e facilita consistência entre features.
- **Trade-off**: URL e copy da UI ficam em idiomas diferentes; aceitável porque o produto é brasileiro e as rotas são superfície técnica.
- **Scope**: Todas as rotas em `src/app` e links internos.
- **Date**: 2026-07-16
- **Status**: active

### AD-015
- **Decision**: Dados cadastrais do usuário (CPF, nascimento, endereço, aceite de termos) vivem como `user.additionalFields` do Better Auth no model `User`, não em tabela `UserProfile` separada — enquanto não houver motivo claro para separar.
- **Reason**: Signup atômico via `signUpEmail`; sessão já carrega o perfil; menos orquestração e superfície de falha parcial.
- **Trade-off**: Model `User` cresce; regenerar o CLI do Better Auth exige reaplicar constraints manuais (ex.: `@@unique([cpf])`).
- **Scope**: Módulo `auth` e schema Prisma `User`.
- **Date**: 2026-07-16
- **Status**: active

## Handoff

- **Feature**: commitments (Roadmap item 4) — Specify → Design → Tasks → Execute → Validate concluídos ✅

- **Phase / Task**: Todas as 17 tasks das 5 fases implementadas sequencialmente (sem sub-agents, conforme instrução do usuário):
  - **Fase 1** (T1-T2): Database schema (Commitment, Installment models) + migration ✅
  - **Fase 2** (T3-T6): Domain layer (types, constants, math functions, schemas, validation) + shadcn components (Progress, RadioGroup) ✅
  - **Fase 3** (T7): Data layer repository com 6 funções atômicas (listagem, get, create com materialização, replacePrevista, setStatus, delete com preservação) ✅
  - **Fase 4** (T8-T11): Server actions (create, setInstallmentStatus, update, delete) com core+wrapper pattern ✅
  - **Fase 5** (T12-T17): React components (modal, list, empty state, delete dialog, coordinator client), page, API públicada, navegação, E2E tests ✅
- **Completed**: Spec (8 stories, 18 requirement IDs com traceability), Tasks (17 atômicas), Execute (schema → migration → domain → data → actions → components → page → E2E). Spec.md, tasks.md, design.md (arquivo não criado — feature simples o suficiente para design inline). 9 commits de feature (T1-T2, T3-T6, T7, T8, T9-T11, T12-T15, T16, T17).
- **Environment constraints**: Testes unitários não rodam localmente (Node v20.15 vs Vitest v4.1.10 que requer v22.13). Integração e E2E não foram executados contra banco real (PostgreSQL não está rodando). Gates (build + lint) passam para todo código escrito.
- **Design decisions implemented**:
  - AD-009: Parcelas materializadas com arredondamento na 1ª (resto de divisão) — invariante testada por unit tests
  - AD-008: Valores monetários como inteiros em centavos, nunca float
  - AD-012: Isolamento por usuário em todos os repositórios (userId obrigatório, nenhuma query sem escopo)
  - AD-010: Fronteiras de módulo reforçadas (commitments/index.ts como único entry point)
  - Atomic transactions: criação, regeneração, exclusão de compromissos sempre em $transaction
  - Pagas são imutáveis: edição/exclusão só afetam previstas; pagas preservadas como histórico
  - Mode preservation: distingue installment_payment vs fixed_payment para redistribuição futura
- **Test coverage**:
  - Unit tests escritos (installments.test.ts, schemas.test.ts) mas não executáveis localmente
  - Integration tests escritos para repositório e actions (commitments-repository.integration.test.ts, create-commitment.integration.test.ts) mas não executáveis sem PostgreSQL
  - E2E spec completo (commitments.spec.ts): signup → categoria → criar 3x parcelamento → verificar arredondamento → marcar paga
- **In-progress**: nenhum
- **Next step**: Rodar CI no GitHub Actions para verificar testes de integração e E2E contra banco de teste real. Se verde, criar PR para main.
- **Blockers**: Nenhum blockers técnicos. Ambiente local limitado por Node version (testes não rodam).
- **Uncommitted files**: nenhum.
- **Branch**: cursor/spec-commitments (a partir de `main` já com auth + categories + transactions mergeadas), 9 commits desta sessão.
