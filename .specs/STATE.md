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

### AD-017
- **Decision**: `PRODUCT.md` e `DESIGN.md` (skill impeccable) são a autoridade de design do produto. Direção visual firmada pelo usuário: canon da categoria (app de orçamento pessoal convencional, sem excentricidade) executado no nível de craft de YNAB/Monarch. Toda feature com UI conforma com DESIGN.md; tokens de tema em `globals.css` são a única fonte de cor; temas claro e escuro são ambos de primeira classe (WCAG AA par a par).
- **Reason**: Fase 2 introduz identidade visual; sem autoridade documentada, cada feature reinventaria decisões visuais. O usuário recusou direções expressivas explicitamente — a convenção é o compromisso.
- **Trade-off**: Menos espaço para expressividade visual; mudanças de identidade exigem atualizar DESIGN.md antes do código.
- **Scope**: Todas as features com UI a partir da Fase 2.
- **Date**: 2026-07-23
- **Status**: active

## Handoff

- **Feature**: app-shell (Roadmap item 7, Fase 2) — `.specs/features/app-shell/` — Execute ✅ completo (T1–T9), aguardando Verifier
- **Phase / Task**: Specify ✅ → Discuss ✅ → Design ✅ → Tasks ✅ → Execute ✅ (inline, 3 fases ≤ limite de sub-agentes) → Verify ⏳ (dispatch imediatamente após este handoff)
- **Completed (Execute Phase)**:
  - Fase 1 (T1–T3): paleta Prumo claro/escuro em `globals.css` + `theme-contrast.test.ts` (16 pares × 2 temas) → `ThemeProvider` global (next-themes, `attribute="class"`, `defaultTheme="system"`) → `NAV_ITEMS`/`isActive()` puro
  - Fase 2 (T4–T7): primitivo `Sheet` vendored → `AppShell` (sidebar fixa ≥lg, skip link, logout, `aria-current`) integrado em `app/layout.tsx` (removido `LogoutButton` duplicado do dashboard) → drawer mobile (`Sheet` lado esquerdo, mesmos itens) → `ThemeToggle` (3 estados, `role="group"`, hidratação via `useSyncExternalStore`)
  - Fase 3 (T8–T9): auditoria dark via screenshots Playwright (5 páginas internas + home/login/signup/terms) — único achado real: `bg-zinc-50 dark:bg-black` (4 páginas) trocado por `bg-background`; detector do impeccable sem findings; **bug pré-existente encontrado e corrigido**: `--font-sans: var(--font-sans)` em `globals.css` era auto-referente (nunca resolvia) — o site inteiro renderizava em Times New Roman de fallback do browser em vez de Geist desde sempre; corrigido para `var(--font-geist-sans)`; `DESIGN.md` carbonizado (tokens reais, sem placeholders) + sidecar `.impeccable/design.json` gerado
  - Commits: 2db528b (T1) → 8b001f4 (T2) → a0ff37d (T3) → 1617854 (T4) → a2d5153 (T5, ajusta seletores e2e ambíguos por `.first()`) → a57ffa4 (T6) → 82537bd (T7) → b09b6bc (T8) → [T9, este commit]
  - Tests: 193 unit (149 base + 44 novos) + 156 integration (baseline mantido, feature não toca `data/`/`actions/`) + 39 e2e (22 base + 17 novos: 2 theme mecanismo, 6 shell desktop, 5 drawer mobile, 6 toggle); lint 0 errors; build ✅
- **Verifier**: ainda não rodou — próximo passo obrigatório desta sessão (spec-anchored check + discrimination sensor + `.specs/features/app-shell/validation.md`).
- **Gates**: typecheck ✅, lint ✅ (0 errors), unit 193 ✅, integration 156 ✅, e2e 39 ✅, build ✅
- **Decisões da spec (usuário, ver `context.md`)**: shell de navegação antes da landing; fundação de design embutida nesta feature (PRODUCT.md/DESIGN.md via impeccable); sidebar fixa desktop + drawer mobile; dark mode em escopo (segue sistema por padrão, toggle persistido).
- **Achado fora do escopo original mas corrigido nesta feature**: bug de fonte (`--font-sans` auto-referente) — pré-existente, não causado pelo app-shell, mas descoberto ao carbonizar DESIGN.md (T9) e corrigido por ser uma linha em `globals.css`, arquivo já de propriedade desta feature (SHELL-13) e coberto pela decisão de design "validar Geist no build" registrada em `design.md`.
- **Environment**: Node v24 (Vitest 4, PATH do nvm); Postgres de teste local via container Docker `prumo-test-pg` (porta 55432) — precisa `docker start prumo-test-pg` se parado. Baselines upheld: 182 → 193 unit (T1/T3), 156 integration inalterado, 22 → 39 e2e.
- **Blockers**: none.
- **Uncommitted files**: none.
- **Branch**: `cursor/spec-app-shell`. `ROADMAP.md` item 7 atualizado para concluída (mesmo commit de T9, regra do AGENTS.md).
