# Landing Page Specification

**Feature:** `landing` — Roadmap item 8 (Fase 2)
**Scope class:** Large (multi-componente: shell público, landing, restyle auth; spec completa + design + tasks)
**Context:** decisões do usuário em `context.md` (2026-07-23)

## Problem Statement

A home `/` é um placeholder estático sem direcionamento: um visitante anônimo não entende o que o Prumo faz nem encontra caminho para criar conta ou entrar. As páginas de login/cadastro usam o default do shadcn/ui, destoando da identidade visual firmada no item 7 (DESIGN.md, AD-017). O produto está em produção mas não tem porta de entrada.

## Goals

- [ ] Visitante anônimo entende a proposta do Prumo e chega ao cadastro ou login a partir de `/` (E2E verde)
- [ ] Todas as páginas públicas (`/`, `/login`, `/signup`, `/terms`) compartilham o shell público e conformam com DESIGN.md nos dois temas (WCAG AA)
- [ ] `/` continua renderizando sem depender do banco (edge case SETUP-03 preservado)

## Out of Scope

| Feature | Reason |
| --- | --- |
| Prova social (depoimentos, números de usuários, imprensa) | Não existem evidências reais; inventar é proibido (PRODUCT.md, Evidence on Hand) |
| Restyle do conteúdo de `/terms` | Item 9 (app-polish); aqui `/terms` só herda o shell |
| Polish das páginas da área logada | Item 9 (app-polish) |
| Mudança de comportamento/validação nos forms de auth | Restyle é só apresentação; regras de negócio do módulo auth ficam intactas |
| Analytics / tracking de conversão | Sem infra de analytics no projeto; fora do MVP |
| OG image / social cards customizados | Exigiria asset design dedicado; metadata textual basta nesta feature |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Header público no mobile | Âncoras ocultas; wordmark + CTAs "Entrar"/"Criar conta" + toggle de tema permanecem. Sem drawer público. | Dois CTAs curtos cabem em 375px; um drawer só para âncoras adiciona complexidade sem ganho de conversão | n (default do agente) |
| Comportamento do header no scroll | Header sticky na landing; âncoras com scroll suave, instantâneo sob `prefers-reduced-motion` | Padrão do canon (YNAB/Monarch); acessibilidade preservada | n (default do agente) |
| Metadata das páginas públicas | `/`: title "Prumo — Sua vida financeira alinhada." + description da proposta de valor; `/login`: "Entrar — Prumo"; `/signup`: "Criar conta — Prumo"; `/terms`: "Termos de uso — Prumo" | "Página pública completa" implica metadata básica por página | n (default do agente) |
| Seção de fechamento com CTA | Landing termina com seção de conversão (reforço da tagline + CTA "Criar conta") antes do footer | Padrão do canon; coberto por "CTAs de Criar conta e Entrar" do roadmap | n (default do agente) |
| Detecção de sessão na landing | Presença do cookie de sessão do Better Auth (verificação otimista, sem banco); nome exato do cookie verificado na implementação | Decisão do usuário: preservar SETUP-03; cookie expirado mostrando "Ir para o app" é trade-off aceito | y |
| Ajustes de selectors em testes existentes de auth | Permitidos quando a semântica da asserção se mantém (aprendizado do fix de E2E de projections: selectors acompanham a UI) | Restyle muda markup; asserções comportamentais não podem enfraquecer | y (implícito na decisão "forms inclusos") |

**Open questions:** none — all resolved or logged above.

**Dimensions sweep (Medium/Large):** input validation N/A (nenhum input novo; forms de auth mantêm validação existente) · failure states → LAND-06 (banco fora do ar) · idempotency/retry N/A (sem escrita) · auth boundaries → LAND-16/17 + redirects existentes mantidos (AUTH AC6) · concurrency N/A · data lifecycle N/A (persistência de tema já existe, SHELL) · observability N/A (sem novas rotas de API) · external-dependency N/A (sem chamadas externas; fonts via `next/font`) · state transitions N/A.

---

## User Stories

### P1: Visitante conhece o Prumo na landing ⭐ MVP

**User Story**: Como visitante anônimo, quero entender em segundos o que o Prumo faz e como ele me dá previsibilidade, para decidir criar uma conta.

**Why P1**: É a porta de entrada do produto — sem ela não há aquisição; motivação central do item 8.

**Acceptance Criteria**:

1. **LAND-01** — WHEN um visitante anônimo acessa `/` THEN o sistema SHALL renderizar um hero com o wordmark "Prumo", a tagline "Sua vida financeira alinhada.", um subtítulo de proposta de valor e CTAs "Criar conta" (link para `/signup`) e "Entrar" (link para `/login`).
2. **LAND-02** — WHEN o hero renderiza THEN o sistema SHALL exibir um mockup do produto recriado em componentes (prévia de projeção/dashboard com dados de exemplo), legível nos temas claro e escuro.
3. **LAND-03** — WHEN o visitante rola a página THEN o sistema SHALL exibir três seções de proposta de valor — previsibilidade, parcelas/financiamentos, projeção mensal — cada uma com título, texto e mini-visual, com lados alternados no desktop e empilhadas no mobile.
4. **LAND-04** — WHEN o visitante chega ao fim da página THEN o sistema SHALL exibir uma seção de fechamento com CTA "Criar conta" (link para `/signup`) antes do footer.
5. **LAND-05** — WHEN qualquer visual de exemplo exibe valores THEN os dados SHALL ser coerentes: em BRL formatado pt-BR, parcelas somando exatamente o valor total e saldo projetado = entradas − saídas (verificado por teste sobre a fixture de dados de exemplo).
6. **LAND-06** — WHEN o banco de dados está indisponível THEN `/` SHALL renderizar normalmente — a página e o shell público não fazem nenhuma consulta a banco (detecção de sessão só por leitura de cookie).

**Independent Test**: Subir o app sem banco, acessar `/` anonimamente e ver hero, três seções, fechamento e CTAs navegando para `/signup` e `/login`.

---

### P1: Shell público leva ao cadastro/login de qualquer página pública ⭐ MVP

**User Story**: Como visitante, quero um header e footer consistentes em todas as páginas públicas, para navegar entre landing, login, cadastro e termos sem me perder.

**Why P1**: O E2E do roadmap ("visitante anônimo navega da landing até o cadastro/login") depende dele; garante identidade consistente na área pública.

**Acceptance Criteria**:

1. **LAND-07** — WHEN qualquer página pública (`/`, `/login`, `/signup`, `/terms`) renderiza THEN o sistema SHALL exibir o header público com wordmark "Prumo" (link para `/`) e CTAs "Entrar" (`/login`) e "Criar conta" (`/signup`).
2. **LAND-08** — WHEN qualquer página pública renderiza THEN o sistema SHALL exibir o footer público com a tagline "Sua vida financeira alinhada.", link para `/terms` e linha de copyright.
3. **LAND-09** — WHEN o visitante usa o toggle de tema no header público THEN o sistema SHALL alternar claro/escuro/sistema com a mesma persistência do shell logado (a escolha vale nas duas áreas).
4. **LAND-10** — WHEN o visitante está na landing THEN o header SHALL exibir links de âncora para as seções da página que, ao clique, rolam até a seção correspondente; WHEN está em outra página pública THEN as âncoras SHALL estar ausentes.
5. **LAND-11** — WHEN a viewport é mobile (≤ 767px) THEN o header SHALL ocultar as âncoras mantendo wordmark, CTAs e toggle de tema, sem overflow horizontal.
6. **LAND-12** — WHEN qualquer página pública renderiza THEN o sistema SHALL expor landmarks acessíveis (`header`/`nav`/`main`/`footer`), navegação completa por teclado e contraste WCAG AA nos dois temas (tokens de `globals.css` como única fonte de cor).

**Independent Test**: Navegar `/` → `/login` → `/signup` → `/terms` vendo header/footer consistentes; alternar tema e vê-lo persistir; verificar âncoras só na landing.

---

### P1: Login e cadastro alinhados à identidade visual ⭐ MVP

**User Story**: Como visitante que decidiu entrar ou criar conta, quero páginas de autenticação com a mesma qualidade visual da landing, para confiar no produto no momento mais sensível do funil.

**Why P1**: Requisito explícito do item 8; hoje as páginas destoam da identidade firmada no item 7.

**Acceptance Criteria**:

1. **LAND-13** — WHEN o visitante acessa `/login` ou `/signup` THEN o sistema SHALL renderizar o formulário em card centrado sob o shell público, conformando com DESIGN.md nos dois temas.
2. **LAND-14** — WHEN os componentes `LoginForm`/`SignUpForm` são atualizados THEN o restyle SHALL ser apenas de apresentação (hierarquia, espaçamento, copy, estados de erro): campos, validações, mensagens de erro comportamentais e fluxos de submit permanecem os atuais, e os testes comportamentais existentes continuam passando (ajustes de selector permitidos quando a semântica da asserção se mantém).
3. **LAND-15** — WHEN o visitante acessa `/terms` THEN a página SHALL herdar o shell público e a tipografia dos tokens, mantendo o conteúdo placeholder atual.

**Independent Test**: Acessar `/login` e `/signup` nos dois temas e comparar com DESIGN.md; rodar a suíte de auth existente e vê-la verde.

---

### P2: Usuário autenticado é reconhecido nas páginas públicas

**User Story**: Como usuário já logado que visita `/`, quero um atalho direto para o app em vez de CTAs de cadastro, para voltar ao produto em um clique.

**Why P2**: Melhora a UX de retorno, mas o fluxo anônimo (P1) é o objetivo do item; sem isso o usuário logado ainda chega ao app via "Entrar" → redirect.

**Acceptance Criteria**:

1. **LAND-16** — WHEN há cookie de sessão do Better Auth presente e o usuário acessa uma página pública THEN o header SHALL exibir "Ir para o app" (link para `/app`) no lugar de "Entrar"/"Criar conta", sem consultar o banco.
2. **LAND-17** — WHEN não há cookie de sessão THEN o header SHALL exibir "Entrar" e "Criar conta".
3. **LAND-18** — WHEN o usuário autenticado acessa `/login` ou `/signup` THEN o sistema SHALL manter o redirect atual para `/app` (comportamento AUTH AC6 inalterado, coberto pelos testes existentes).

**Independent Test**: Logar, visitar `/` e ver "Ir para o app"; deslogar e ver os CTAs padrão.

---

### P2: Metadata das páginas públicas

**User Story**: Como visitante vindo de um link ou busca, quero título e descrição corretos por página, para saber onde estou antes de clicar.

**Why P2**: Parte de "página pública completa", mas não bloqueia o funil de conversão.

**Acceptance Criteria**:

1. **LAND-19** — WHEN cada página pública renderiza THEN o `<title>`/description SHALL ser os definidos na tabela de assumptions (`/` = "Prumo — Sua vida financeira alinhada." + description da proposta de valor; `/login` = "Entrar — Prumo"; `/signup` = "Criar conta — Prumo"; `/terms` = "Termos de uso — Prumo").

---

## Edge Cases

- WHEN o banco está fora do ar THEN `/`, `/terms` e o shell público SHALL renderizar normalmente (LAND-06); `/login` e `/signup` mantêm a dependência atual de `getSession` (comportamento pré-existente, fora do escopo mudar).
- WHEN o cookie de sessão está expirado/inválido THEN o header mostra "Ir para o app" e o clique leva a `/app`, onde a proteção existente redireciona para `/login` — degradação aceita e documentada (context.md).
- WHEN a viewport é 375px THEN nenhuma página pública SHALL ter overflow horizontal; seções empilham; mockup do hero permanece legível.
- WHEN `prefers-reduced-motion` está ativo THEN o scroll de âncoras SHALL ser instantâneo e nenhuma animação essencial SHALL bloquear conteúdo.
- WHEN o tema é escuro THEN o mockup do hero e os mini-visuais SHALL manter contraste AA (mesma exigência do claro).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LAND-01 | P1: Landing | Design | Verified |
| LAND-02 | P1: Landing | Design | Verified |
| LAND-03 | P1: Landing | Design | Verified |
| LAND-04 | P1: Landing | Design | Verified |
| LAND-05 | P1: Landing | Design | Verified |
| LAND-06 | P1: Landing | Design | Verified |
| LAND-07 | P1: Shell público | Design | Verified |
| LAND-08 | P1: Shell público | Design | Verified |
| LAND-09 | P1: Shell público | Design | Verified |
| LAND-10 | P1: Shell público | Design | Verified |
| LAND-11 | P1: Shell público | Design | Verified |
| LAND-12 | P1: Shell público | Design | Verified |
| LAND-13 | P1: Auth restyle | Design | Verified |
| LAND-14 | P1: Auth restyle | Design | Verified |
| LAND-15 | P1: Auth restyle | Design | Verified |
| LAND-16 | P2: Autenticado | Design | Verified |
| LAND-17 | P2: Autenticado | Design | Verified |
| LAND-18 | P2: Autenticado | Design | Verified |
| LAND-19 | P2: Metadata | Design | Verified |

**Coverage:** 19 total, 19 mapped to tasks (T1–T14), 0 unmapped ✅

---

## Success Criteria

- [x] E2E: visitante anônimo navega da landing até `/signup` e até `/login` pelo shell público (roadmap item 8)
- [x] E2E: usuário com sessão vê "Ir para o app" na landing e chega ao `/app` em um clique
- [x] Suíte de auth existente verde sem enfraquecimento de asserções comportamentais
- [x] Contraste AA verificado nos dois temas para as novas superfícies (mesmo padrão de teste de tokens do item 7)
- [x] Todos os gates verdes (typecheck, lint, unit, integração, E2E, build)
