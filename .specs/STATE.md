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

### AD-016
- **Decision**: Agregações cross-módulo sempre via API pública do módulo dono — o módulo que possui a tabela expõe a consulta agregada em seu `index.ts`; módulos consumidores (`projections`, futuro dashboard) nunca leem tabelas de outros módulos diretamente via Prisma.
- **Reason**: Preserva ownership do schema (mudanças de tabela ficam contidas no módulo dono) e mantém a fronteira de AD-010 também na camada de dados, onde o lint de imports não alcança.
- **Trade-off**: Features de leitura cross-módulo exigem pequenas adições nas APIs públicas dos módulos donos.
- **Scope**: Todos os módulos; primeiro uso em `projections` (roadmap item 5).
- **Date**: 2026-07-20
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
- **Environment constraints**: Rodar tudo com Node v22+/v24, não v20.15 (Vitest 4 exige v22.13+): `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` nesta sandbox antes de qualquer `pnpm test:*`/`typecheck`/`lint`.
- **Design decisions implemented**:
  - AD-009: Parcelas materializadas com arredondamento na 1ª (resto de divisão) — invariante testada por unit tests
  - AD-008: Valores monetários como inteiros em centavos, nunca float
  - AD-012: Isolamento por usuário em todos os repositórios (userId obrigatório, nenhuma query sem escopo)
  - AD-010: Fronteiras de módulo reforçadas (commitments/index.ts como único entry point)
  - Atomic transactions: criação, regeneração, exclusão de compromissos sempre em $transaction
  - Pagas são imutáveis: edição/exclusão só afetam previstas; pagas preservadas como histórico
  - Mode preservation: distingue installment_payment vs fixed_payment para redistribuição futura
- **Test coverage — status atual: TUDO VERDE** ✅
  - `pnpm test:unit`: 114/114 passando (9 arquivos)
  - `pnpm test:integration`: 123/123 passando (13 arquivos)
  - `pnpm typecheck`: limpo
  - `pnpm lint`: 0 erros (1 warning pré-existente e intencional: `_scope` não usado em `regeneratePrevistaInstallments`, parâmetro reservado para suporte futuro a `scope: "futuras"`)
  - E2E spec completo (commitments.spec.ts): signup → categoria → criar 3x parcelamento → verificar arredondamento → marcar paga (não executado nesta sessão — Playwright não rodado)
- **In-progress**: nenhum. Sessão anterior tinha detectado 27→10 falhas de integração; esta sessão fechou as 10 restantes e depois expandiu o gate para unit+typecheck+lint (nunca tinham rodado sob Node compatível). Tudo commitável agora.
- **Root causes encontradas e corrigidas nesta sessão (arquivos modificados, ainda não commitados — ver `git status`/`git diff`)**:
  1. `vitest.global-setup.ts`: `seed()` só era chamado no branch do Testcontainers (sem `DATABASE_URL`). Como `.env.test` já define `DATABASE_URL`, o seed nunca rodava → 0 categorias padrão. Fix: chamar `await seed()` também quando `DATABASE_URL` já está setada.
  2. `create-commitment.integration.test.ts`: limpeza de sessão anterior usava `deleteMany({})` sem filtro em `category`/`user`/`session`, apagando as 23 categorias padrão globais; `beforeEach` também apagava o setup do `beforeAll` antes do 1º teste. Fix: escopar tudo por `testUserId`. Além disso, `prisma.session.create()` manual não autentica no Better Auth (cookies são assinados, não token cru) — reescrito para usar o fluxo real `signUpCore` + `Set-Cookie` real (mesmo padrão de `create-transaction.integration.test.ts`), igual ao que resolveu os 10 failures restantes.
  3. `commitments-repository.integration.test.ts`: mesmo padrão de `deleteMany({})` sem filtro, escopado para `[testUserId, otherUserId]`; faltava import de `INSTALLMENT_NOT_FOUND_ERROR`.
  4. Bug de teste (não de infra): `create-commitment.integration.test.ts` "should create fixed_payment commitment" comparava `commitment.total` com `money(1200 * 48)` mas `installmentValue: "1.200,00"` parseia para R$1.200,00 (120000 centavos) — corrigido para `money(120000 * 48)`.
  5. **Bug real de produção encontrado e corrigido**: `listCategoriesByUser` (categories-repository.ts) ordenava via `orderBy: { name: "asc" }` do Prisma, que usa a collation padrão do Postgres (byte-order/"C"), não pt-BR — "Conta de luz" vinha antes de "Conta de água". Fix: buscar sem `orderBy` e ordenar em JS com `localeCompare(name, "pt-BR")`.
  6. **Bug real de produção encontrado e corrigido**: `addMonths`/`getLastDayOfMonth` (`src/shared/date-utils.ts`) misturavam `parseDate` (UTC) com getters/setters de hora LOCAL (`getMonth`, `setMonth`, `new Date(y,m,d)`). Em timezone UTC-3 (America/Sao_Paulo, timezone do time), isso causava (a) off-by-one no dia por causa do mismatch UTC/local, e (b) `setMonth` sem clamping fazia 31/jan + 1 mês rolar para 03/mar em vez de clampar em 28/fev. Reescrito para operar 100% em UTC com clamping interno em `addMonths`. `scheduleDueDates` (`commitments/domain/installments.ts`) tinha um clamp redundante e também quebrado (mesma mistura local/UTC) — removido, já que `addMonths` agora clampa sozinho.
  7. `installments.test.ts`: ~20 erros de typecheck pré-existentes (nunca detectados por falta de Node compatível) — números crus passados onde a assinatura pede `Money` (tipo branded via Zod). Fix mecânico: envolver com `money(n)`.
  8. `create-commitment.integration.test.ts` / `commitments-repository.integration.test.ts`: typecheck também acusava `result.fieldErrors` (união discriminada não estreitada) e `commitment.installments` (campo opcional no tipo `Commitment`) — corrigido com narrowing (`if (result.ok) throw`) e non-null assertions onde o teste sabe que o valor está populado.
  9. Lint pré-existente (não introduzido nesta sessão): 6 erros `no-explicit-any` em `CommitmentList.tsx`/`CommitmentModal.tsx` (casts desnecessários — `Money` já é `number`-branded, `formatBRL` aceita direto) e 2 warnings de var não usada (`action` morto em `CommitmentModal.tsx`, `isPending` não usado em `CommitmentsPageClient.tsx`) — todos corrigidos.
- **Next step**:
  1. Revisar o diff (`git diff`) e decidir se commita tudo junto ou separa em commits menores (ex.: um para os fixes de teste/infra, outro para os 2 bugs de produção — ordenação de categorias e `addMonths`).
  2. Depois de commitado, considerar rodar `pnpm test:e2e` (Playwright) — não executado nesta sessão.
  3. Atualizar `/home/vbotelho/.claude/projects/-home-vbotelho-git-nextjs-prumo/memory/commitments_feature_status.md` removendo o blocker de testes de integração (todos os gates estão verdes agora).
  4. Se for abrir PR para `main`, mencionar os 2 bugs de produção (ordenação pt-BR de categorias, clamping de datas em `addMonths`) na descrição — não são triviais, afetam dados reais exibidos ao usuário.
- **Blockers**: Nenhum. Todos os gates (typecheck, lint, unit, integration) verdes.
- **Uncommitted files**: ver `git status` — 11 arquivos modificados (2 arquivos de produção com bugs reais corrigidos: `src/modules/categories/data/categories-repository.ts`, `src/shared/date-utils.ts`; demais são testes + `vitest.global-setup.ts` + componentes de lint + `.specs/STATE.md`).
- **Branch**: cursor/spec-commitments (a partir de `main` já com auth + categories + transactions mergeadas), 9 commits de feature + 1 commit de fix de testes já feito ("fix(tests): correct integration test cleanup and error handling") + fixes desta sessão ainda não commitados.
