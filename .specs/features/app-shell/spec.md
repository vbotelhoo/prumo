# App Shell + Fundação de Design — Specification

> Roadmap item 7 (Fase 2). Decisões do usuário em [context.md](context.md).

## Problem Statement

A área logada (`/app/*`) não tem navegação: as cinco páginas do MVP existem mas não se linkam entre si, e o logout só está visível no dashboard. Além disso, o produto não tem identidade visual própria — o tema é o default do shadcn/ui. Esta feature cria o shell de navegação global da área logada e, junto com ele, a fundação de design do Prumo (identidade visual, tokens, documentação `PRODUCT.md`/`DESIGN.md` via skill `impeccable`), que as features seguintes da Fase 2 herdam.

## Goals

- [ ] Usuário autenticado alcança qualquer seção da área logada em 1 clique, a partir de qualquer página
- [ ] Logout acessível de qualquer página da área logada
- [ ] Identidade visual do Prumo definida, documentada e aplicada ao shell via tokens (única fonte de cor)

## Módulos tocados

Nenhum módulo de domínio é alterado. A feature vive em `src/app/app/` (composição) e `src/shared/components/ui` (primitivas genéricas novas, ex.: sheet/drawer). O módulo `auth` é consumido apenas pela API pública existente (`LogoutButton`, `auth.api.getSession`). Nenhuma API pública muda.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Landing page pública em `/` | Roadmap item 8 (`landing`) |
| Restyling das páginas internas (tabelas, forms, gráficos) | Roadmap item 9 (`app-polish`); elas herdam automaticamente os novos tokens, mas não são retrabalhadas aqui |
| Notificações, busca global, breadcrumbs no shell | Sem requisito no produto atual |
| Alterar comportamento de auth (guard, redirect de logout) | Comportamento existente (AUTH-11/AUTH-12) é preservado, não redefinido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Destino do logout | Mantém `signOutAction` atual: redirect para `/` (AUTH-12) | Não reabrir decisão de auth; shell só reutiliza a API pública | y (código) |
| Breakpoint sidebar ↔ drawer | `lg` (1024px) do Tailwind | 5 itens + conteúdo denso (tabelas) pedem largura; abaixo disso, drawer | n (default proposto) |
| Tema | Dark mode em escopo: segue o sistema por padrão + toggle claro/escuro/sistema persistido (context.md #5) | Decisão do usuário no ajuste da spec | y |
| Mecanismo de persistência do tema | Decidido na fase de Design (ex.: next-themes vs cookie próprio); a spec só exige persistência entre sessões e ausência de flash | Escolha técnica, não de produto | n (delegado ao design) |
| Alcance do toggle | A preferência de tema vale globalmente (tokens globais), mas o controle vive apenas no shell da área logada nesta feature; páginas públicas seguem o tema sem controle próprio | Landing/login serão retrabalhadas nos itens 8–9 da Fase 2 | n (default proposto) |
| Fonte tipográfica | Decisão sai do `impeccable new-work` (manter Geist ou trocar), registrada em DESIGN.md; carregamento sempre via `next/font` | Escolha estética pertence à fase de design, não à spec | n (delegado ao design) |
| Localização dos componentes do shell | `src/app/app/_components/` (composição); primitivas genéricas reutilizáveis em `src/shared/components/ui` | Regras de fronteira do PROJECT.md: `app/` só compõe; `shared` só genérico | y (arquitetura) |
| Página ativa em sub-rotas futuras | Match exato para `/app` (Dashboard); match por prefixo para as demais seções | Evita dois itens ativos; sub-rotas (ex.: detalhe futuro) mantêm a seção destacada | n (default proposto) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Navegação global pela sidebar ⭐ MVP

**User Story**: Como usuário autenticado, quero uma navegação sempre visível entre as seções do app para não depender de digitar URLs.

**Why P1**: É a dor central que motivou a Fase 2 — hoje não há como navegar entre páginas.

**Acceptance Criteria**:

1. WHEN um usuário autenticado acessa qualquer rota sob `/app` THEN o sistema SHALL renderizar o shell com uma sidebar contendo, nesta ordem, links para: Dashboard (`/app`), Transações (`/app/transactions`), Compromissos (`/app/commitments`), Categorias (`/app/categories`) e Projeções (`/app/projections`). [SHELL-01]
2. WHEN o usuário clica em um link da sidebar THEN o sistema SHALL navegar para a rota correspondente e exibir a página de destino. [SHELL-02]
3. WHEN a rota atual é exatamente `/app` THEN somente o item Dashboard SHALL ter `aria-current="page"`; WHEN a rota atual é ou começa com o path de outra seção THEN somente o item dessa seção SHALL ter `aria-current="page"`. [SHELL-03]
4. WHEN o shell é renderizado THEN a marca "Prumo" SHALL aparecer no topo da sidebar como link para `/app`. [SHELL-04]

**Independent Test**: Logar, visitar cada uma das 5 rotas e verificar sidebar presente, item correto marcado como ativo e navegação por clique funcionando.

---

### P1: Sessão visível e logout de qualquer página ⭐ MVP

**User Story**: Como usuário autenticado, quero ver quem está logado e poder sair de qualquer página.

**Why P1**: Hoje o logout só existe no dashboard; sessão presa é fricção e risco em máquina compartilhada.

**Acceptance Criteria**:

1. WHEN qualquer página sob `/app` é exibida THEN o shell SHALL exibir o nome do usuário da sessão. [SHELL-05]
2. WHEN o usuário aciona "Sair" no shell (em qualquer página) THEN a sessão SHALL ser encerrada e o usuário redirecionado para `/` (comportamento atual de `signOutAction`, AUTH-12 preservado). [SHELL-06]
3. WHEN um usuário sem sessão acessa qualquer rota sob `/app` THEN o sistema SHALL redirecionar para `/login` (guard existente AUTH-11 preservado com o shell no layout). [SHELL-07]

**Independent Test**: Logar, ir para `/app/categories`, clicar "Sair" no shell, verificar redirect para `/` e que `/app` volta a exigir login.

---

### P1: Shell responsivo (drawer mobile) ⭐ MVP

**User Story**: Como usuário no celular, quero acessar a navegação sem que ela roube espaço do conteúdo.

**Why P1**: App financeiro é consultado majoritariamente no celular; sidebar fixa não cabe em viewport estreita.

**Acceptance Criteria**:

1. WHEN o viewport é menor que `lg` (1024px) THEN a sidebar SHALL ficar oculta e uma barra superior com botão de menu (rótulo acessível) SHALL ser exibida. [SHELL-08]
2. WHEN o botão de menu é acionado THEN um drawer SHALL abrir contendo os mesmos links, marca e ações (usuário/logout) da sidebar. [SHELL-09]
3. WHEN um link do drawer é acionado THEN o sistema SHALL navegar e o drawer SHALL fechar. [SHELL-10]
4. WHEN o drawer está aberto e o usuário pressiona `Esc` ou clica no overlay THEN o drawer SHALL fechar. [SHELL-11]

**Independent Test**: Em viewport 390×844, abrir o menu, navegar para Transações, verificar drawer fechado e página exibida.

---

### P1: Fundação de design — identidade visual do Prumo ⭐ MVP

**User Story**: Como produto, o Prumo precisa de identidade visual própria (ordem, equilíbrio, "estar no prumo") em vez do default do shadcn/ui.

**Why P1**: Decisão do usuário (context.md #3): a fundação nasce nesta feature; landing e polish herdam.

**Acceptance Criteria**:

1. WHEN a feature é concluída THEN `PRODUCT.md` (produto) e `DESIGN.md` (mundo visual: paleta, tipografia, tom, uso dos tokens) SHALL existir e refletir a identidade escolhida via processo `impeccable` (init + new-work). [SHELL-12]
2. WHEN o tema é aplicado (claro ou escuro) THEN os tokens de tema em `globals.css` SHALL ser a única fonte de cor do shell — nenhum componente do shell SHALL conter cor hardcoded (hex/rgb/oklch literais fora de `globals.css`). [SHELL-13]
3. WHEN texto é renderizado no shell em qualquer tema (claro ou escuro) e em qualquer estado (normal, ativo, hover, foco) THEN o par texto/fundo SHALL cumprir WCAG AA — ≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande e componentes de UI. [SHELL-14]

**Independent Test**: DESIGN.md existe e descreve a paleta; grep por cores literais nos componentes do shell retorna vazio; verificação de contraste dos pares de token nos dois temas.

---

### P1: Dark mode ⭐ MVP

**User Story**: Como usuário, quero usar o app no tema claro ou escuro, seguindo meu sistema por padrão, para conforto visual.

**Why P1**: Decisão do usuário no ajuste da spec (context.md #5): dark mode entra nesta feature, junto com a definição dos tokens — definir os dois temas de uma vez evita retrabalho na paleta.

**Acceptance Criteria**:

1. WHEN um usuário sem preferência salva acessa o app THEN o tema SHALL seguir a preferência do sistema operacional (`prefers-color-scheme`). [SHELL-18]
2. WHEN o usuário seleciona claro, escuro ou sistema no controle de tema do shell THEN o tema SHALL mudar imediatamente, sem reload da página. [SHELL-19]
3. WHEN o usuário retorna ao app (reload ou nova sessão no mesmo navegador) THEN a preferência salva SHALL ser aplicada já no primeiro paint, sem flash do tema incorreto. [SHELL-20]
4. WHEN o controle de tema é renderizado THEN ele SHALL ter rótulo acessível e expor qual opção (claro/escuro/sistema) está ativa. [SHELL-21]

**Independent Test**: Com preferência do SO em escuro, abrir o app e ver tema escuro; alternar para claro pelo shell, recarregar e ver claro persistido sem flash.

---

### P2: Acessibilidade estrutural do shell

**User Story**: Como usuário de teclado/leitor de tela, quero navegar o shell sem barreiras.

**Why P2**: Os básicos (aria-current, rótulos, Esc) já estão nos P1; aqui entram os refinamentos estruturais.

**Acceptance Criteria**:

1. WHEN a página carrega THEN a navegação SHALL ser um landmark `<nav>` com rótulo acessível, e todos os itens SHALL ser alcançáveis por `Tab` com indicador de foco visível. [SHELL-15]
2. WHEN o usuário de teclado entra na página THEN um link "Pular para o conteúdo" SHALL ser o primeiro elemento focável, levando o foco ao conteúdo principal. [SHELL-16]

**Independent Test**: Navegar todo o shell só com teclado; verificar landmark e skip link com axe/leitor de tela.

---

## Edge Cases

- WHEN o nome do usuário é maior que a largura disponível THEN o shell SHALL truncar com ellipsis sem quebrar o layout. [SHELL-17]
- WHEN uma sub-rota futura de uma seção é acessada (ex.: `/app/commitments/<id>`) THEN o item da seção SHALL permanecer marcado como ativo (match por prefixo, SHELL-03).
- WHEN a sessão expira e o usuário navega por um link do shell THEN o guard do layout SHALL redirecionar para `/login` (coberto por SHELL-07; sem tratamento novo).
- WHEN JavaScript ainda não hidratou THEN os links da sidebar (âncoras) SHALL permanecer funcionais (navegação nativa).
- WHEN a opção "sistema" está ativa e o usuário muda o tema do SO com o app aberto THEN o tema do app SHALL acompanhar a mudança sem reload (SHELL-18).

## Dimensions sweep (Medium)

- **Auth boundaries**: coberto (SHELL-06/07 preservam AUTH-11/12).
- **State transitions**: drawer aberto/fechado coberto (SHELL-09/10/11).
- **Input validation, idempotency, concurrency, data lifecycle, external-dependency failure, observability**: N/A — feature de navegação/apresentação, sem entrada de dados, sem persistência nova, sem chamadas externas novas.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SHELL-01 | P1: Navegação global | Design | Pending |
| SHELL-02 | P1: Navegação global | Design | Pending |
| SHELL-03 | P1: Navegação global | Design | Pending |
| SHELL-04 | P1: Navegação global | Design | Pending |
| SHELL-05 | P1: Sessão e logout | Design | Pending |
| SHELL-06 | P1: Sessão e logout | Design | Pending |
| SHELL-07 | P1: Sessão e logout | Design | Pending |
| SHELL-08 | P1: Shell responsivo | Design | Pending |
| SHELL-09 | P1: Shell responsivo | Design | Pending |
| SHELL-10 | P1: Shell responsivo | Design | Pending |
| SHELL-11 | P1: Shell responsivo | Design | Pending |
| SHELL-12 | P1: Fundação de design | Design | Pending |
| SHELL-13 | P1: Fundação de design | Design | Pending |
| SHELL-14 | P1: Fundação de design | Design | Pending |
| SHELL-15 | P2: Acessibilidade | Design | Pending |
| SHELL-16 | P2: Acessibilidade | Design | Pending |
| SHELL-17 | Edge case (nome longo) | Design | Pending |
| SHELL-18 | P1: Dark mode | Design | Pending |
| SHELL-19 | P1: Dark mode | Design | Pending |
| SHELL-20 | P1: Dark mode | Design | Pending |
| SHELL-21 | P1: Dark mode | Design | Pending |

**Coverage:** 21 total, 21 mapped to tasks (T1–T9 em `tasks.md`), 0 unmapped ✅

---

## Testes previstos

- **Unit (Vitest)**: helper puro de item ativo (`isActive(pathname, href)`) — match exato `/app`, prefixo nas seções, nunca dois ativos (SHELL-03).
- **Integração**: nenhuma — a feature não toca `data/` nem `actions/` (logout já coberto pela suíte do módulo `auth`).
- **E2E (Playwright)**: navegar pelas 5 seções via sidebar com verificação de `aria-current` (SHELL-01..04); logout pelo shell a partir de página que não o dashboard (SHELL-05..06); fluxo mobile com drawer em viewport estreita (SHELL-08..11); tema seguindo `colorScheme` emulado, alternância pelo toggle e persistência após reload (SHELL-18..20).

## Success Criteria

- [ ] De qualquer página da área logada, qualquer outra seção é alcançável em 1 clique (desktop) ou 2 (mobile: menu → link)
- [ ] Logout disponível em 100% das páginas sob `/app`
- [ ] `PRODUCT.md` e `DESIGN.md` criados; zero cores hardcoded nos componentes do shell; contraste AA verificado nos dois temas
- [ ] Tema claro/escuro funcional: segue o sistema por padrão, toggle persistido, sem flash no primeiro paint
- [ ] Suítes existentes continuam verdes (baseline: 149 unit / 156 integration / 22 e2e) + novos testes do shell
