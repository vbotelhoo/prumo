# Roadmap — Prumo

Ordem de implementação do MVP. Cada feature segue o fluxo spec-driven (spec → design → tasks → execução com testes) em `.specs/features/`, e só é concluída com sua suíte de testes passando no CI.

## MVP

### 1. Setup do projeto — `setup`

- Next.js 15+ (App Router) com TypeScript
- Prisma + PostgreSQL
- Better Auth instalado e configurado
- Estrutura de módulos (`src/modules/*`, `src/shared`, `e2e/`)
- Lint de fronteiras de módulos (violação quebra o build)
- Vitest (unit + integração) e Playwright configurados
- Workflow de CI no GitHub Actions: lint, typecheck, unit, integração, E2E, build
- `README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`
- Deploy inicial no Railway (serviço `prumo` + PostgreSQL gerenciado)

**Status**: ✅ concluída (2026-07-16) — CI verde em `main`, deploy no ar em [prumo.up.railway.app](https://prumo.up.railway.app/), branch `main` protegida (merge só via PR com os 5 checks do CI verdes). Validação em `.specs/features/setup/validation.md`.

### 2. Autenticação — módulo `auth`

- Cadastro e login com e-mail/senha (Better Auth)
- Sessão e logout
- E2E: cadastro → login → logout

**Status**: ✅ concluída (2026-07-17) — mergeada em `main` via [PR #2](https://github.com/vbotelhoo/prumo/pull/2), CI verde. Validação em `.specs/features/auth/validation.md`.

### 3. Categorias + Transações avulsas — módulos `categories` e `transactions`

- Categorias padrão + personalizadas por usuário
- Cadastro de entradas e saídas avulsas (data, valor, descrição, categoria)
- Listagem de transações
- E2E: criar transação de entrada e de saída e vê-las na listagem

**Status**: ✅ concluída (2026-07-19) — mergeada em `main` via PRs [#3](https://github.com/vbotelhoo/prumo/pull/3) e [#4](https://github.com/vbotelhoo/prumo/pull/4), os 5 checks de CI verdes. Validação em `.specs/features/categories-transactions/validation.md` (PASS após 4 gate failures encontrados e corrigidos no CI — lições L-006 a L-009).

### 4. Compras parceladas e financiamentos — módulo `commitments`

- Compra parcelada: valor total em N parcelas mensais, parcelas materializadas geradas automaticamente
- Arredondamento: diferença de centavos na primeira parcela; soma das parcelas = valor total
- Dívidas/financiamentos de longo prazo com parcela fixa e acompanhamento de quitação
- Marcar parcela como paga
- Edição/exclusão perguntando se afeta só parcelas futuras ou todas
- E2E: parcelamento com verificação das parcelas futuras e do arredondamento; marcar parcela como paga

**Status**: ✅ concluída (2026-07-20) — 17 tasks implementadas (schema/migration → domain → repositório → server actions → componentes → página → E2E), todos os gates verdes (typecheck, lint, unit, integração, E2E). Validação em `.specs/STATE.md` Handoff.

### 5. Previsibilidade mensal — módulo `projections`

- Visão por mês (atual e futuros): entradas previstas, saídas previstas (incluindo parcelas), saldo projetado, total comprometido
- Saldo projetado = entradas previstas − (despesas avulsas + parcelas do mês)
- E2E: projeção mensal com saldo correto; isolamento entre usuários (2 contas)

**Status**: ✅ concluída (2026-07-22) — 9 tasks implementadas (queries cross-módulo via AD-016 → domain → service → componentes → página → E2E), todos os gates verdes (typecheck, lint, unit 143, integração 139, build). PR [#8](https://github.com/vbotelhoo/prumo/pull/8) aberto para `main`. Validação em `.specs/features/projections/validation.md` (PASS, 18/18 requisitos, 9/9 testes do discrimination sensor).

### 6. Dashboard — composição em `app/`

- Resumo do mês atual: saldo, gastos por categoria (Recharts), próximos vencimentos
- Apenas composição, consumindo APIs públicas dos módulos

**Status**: ✅ concluída (2026-07-22) — 6 tasks implementadas (queries cross-módulo via AD-016 → função pura de composição → componentes (gráfico Recharts + lista de vencimentos) → página → E2E), todos os gates verdes (typecheck, lint, unit 149, integração 153, E2E 20/20, build). Validação em `.specs/features/dashboard/validation.md`.

## Fase 2 — Experiência & Design

Com o MVP funcional em produção, a Fase 2 ataca a experiência: hoje a home `/` é um placeholder sem direcionamento para login/registro, as páginas da área logada não se linkam entre si, e o visual é o default do shadcn/ui sem identidade própria. A fundação de design (identidade visual via skill `impeccable`: `PRODUCT.md`, `DESIGN.md`, tokens) nasce embutida na primeira feature e as demais herdam o sistema.

### 7. Shell de navegação + fundação de design — `app-shell`

- Identidade visual do Prumo definida via `impeccable` (PRODUCT.md + DESIGN.md, paleta, tipografia, tokens em `globals.css`) — primeira aplicação no shell
- Dark mode: temas claro e escuro definidos nos tokens, seguindo a preferência do sistema por padrão, com toggle claro/escuro/sistema no shell e escolha persistida
- Sidebar fixa no desktop, colapsável em drawer no mobile, com links para Dashboard, Transações, Compromissos, Categorias e Projeções
- Indicador de página ativa, nome do usuário e logout acessíveis de qualquer página da área logada
- E2E: navegar entre todas as seções pelo shell; logout a partir do shell

**Status**: ✅ concluída (2026-07-23) — 9 tasks implementadas (tokens de tema + teste de contraste → ThemeProvider global → nav config → primitivo Sheet → sidebar desktop → drawer mobile → toggle de tema → auditoria dark das páginas existentes → carbonização do DESIGN.md/detector), todos os gates verdes (typecheck, lint, unit 193, integração 156, E2E 39, build). `DESIGN.md` carbonizado com os tokens reais + sidecar `.impeccable/design.json`. Validação em `.specs/features/app-shell/validation.md`.

### 8. Landing page — `landing`

- Página pública completa em `/`: hero com tagline, proposta de valor (previsibilidade, parcelas, projeção), seções de funcionalidades e CTAs de "Criar conta" e "Entrar"
- Páginas de login e cadastro alinhadas à identidade visual
- E2E: visitante anônimo navega da landing até o cadastro/login

**Status**: ✅ concluída (2026-07-24) — 14 tasks implementadas (helpers + route group → shell público (header/footer) → tema compartilhado → landing (hero/seções/CTA/metadata) → restyle auth forms), todos os gates de feature verdes (typecheck, lint, unit 222, landing+auth e2e 19/19, build). Validação em `.specs/features/landing/validation.md`.

### 9. Polish da área logada — `app-polish`

- Aplicar o design system às páginas existentes (dashboard, transações, compromissos, categorias, projeções)
- Estados vazios, loading e erro consistentes; responsividade revisada
- Passes `critique`/`polish`/`harden` do `impeccable` sobre cada página

**Status**: ⏳ aguardando itens 7–8

## Fases futuras (fora do MVP)

Sem ordem definida — priorizar após o MVP em produção:

- **Integração bancária / Open Finance**: importação automática de transações
- **App mobile**: experiência nativa ou PWA
- **Múltiplas moedas**: suporte a moedas além do BRL
- **Compartilhamento de contas**: orçamento familiar com múltiplos usuários
- **Notificações de vencimento**: alertas de parcelas e compromissos próximos
