# Polish da Área Logada — Especificação (`app-polish`)

> Roadmap item 9, Fase 2. Escopo: **Large** (5 páginas + primitivos compartilhados + estados novos). Autoridade visual: `PRODUCT.md` + `DESIGN.md` (AD-017), barra YNAB/Monarch.

## Problem Statement

As páginas da área logada (dashboard, transações, compromissos, categorias, projeções) foram construídas durante o MVP, antes da fundação de design dos itens 7–8. Hoje elas usam o visual default do shadcn com 12 arquivos contendo cores hardcoded (gray/zinc/red/green fora dos tokens, violando AD-017), nenhuma rota tem estado de loading ou de erro, a hierarquia numérica é fraca (o número BRL não é protagonista) e o dashboard mantém 4 botões de navegação por emoji que ficaram redundantes com a sidebar do app-shell. O produto público (landing + auth) já está no nível do design system; a área logada — onde o usuário passa o tempo — ainda não.

## Goals

- [ ] As 5 páginas de `/app` conformes ao DESIGN.md: tokens como única fonte de cor, hierarquia numérica exemplar (número BRL protagonista, tabular, alinhado), densidade e copy no nível YNAB/Monarch.
- [ ] Estados vazio, loading e erro consistentes em todas as rotas de `/app`, construídos sobre primitivos compartilhados.
- [ ] Dashboard reestruturado: saldo do mês como número-herói, atalhos de ação de criação no lugar da navegação redundante.
- [ ] Responsividade revisada nas duas cenas (consulta rápida mobile, planejamento desktop) com a mesma dignidade.
- [ ] Passes `critique`/`polish`/`harden` do impeccable sobre cada página, com detector mecânico sem findings.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Novas funcionalidades de domínio (schemas, repositórios, server actions novas) | Polish é apresentação + estados; atalhos do dashboard reutilizam modais/actions existentes |
| Alterações de rotas ou de comportamento das server actions existentes | Regressão zero de comportamento de dados; suítes existentes são o gate |
| Landing, login, cadastro, termos | Concluídos no item 8 |
| Shell de navegação (sidebar/drawer/toggle) | Concluído no item 7; o shell não muda nesta feature |
| Notificações de vencimento, filtros/busca novos, exportação | Fases futuras do roadmap |
| Refactor de arquitetura dos módulos | Fronteiras AD-010 permanecem como estão |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Latitude de mudança | Reestruturar layout/hierarquia dentro do canon, mantendo funcionalidade, rotas e server actions intactas | Decisão do usuário (2026-07-24); apresentação pura não alcança a barra YNAB/Monarch | y |
| Estados de loading/erro | Escopo completo: `loading.tsx` com skeleton por rota + `error.tsx` + empty states unificados | Decisão do usuário (2026-07-24); é o núcleo do "harden" do roadmap | y |
| Botões de navegação do dashboard | Substituir por atalhos de ação de criação ("+ Nova transação", "+ Novo compromisso") | Decisão do usuário (2026-07-24); navegação é responsabilidade do shell, atalhos de criação a sidebar não oferece | y |
| Mecanismo dos atalhos de ação | Definido no Design (deep-link `?new=1` ou modal composto no dashboard); a AC fixa só o resultado: formulário de criação abre | Sem nova server action em nenhuma alternativa; escolha é arquitetural, não de requisito | n (Design) |
| Estratégia de testes | Suítes existentes (unit 222 / integration 156 / e2e) são gate de regressão; testes novos só onde há comportamento novo (estados, atalhos, helpers extraídos); e2e do dashboard ajustado aos atalhos | Padrão estabelecido no restyle da auth (item 8); polish não muda contratos de dados | n (default) |
| `error.tsx` | Um `src/app/app/error.tsx` compartilhado cobrindo todas as sub-rotas | Next.js propaga erro ao boundary do segmento pai; um boundary bem feito evita 5 cópias | n (default) |
| `loading.tsx` | Um por rota (5), com skeleton aproximando a forma real da página | Skeleton genérico único trai a forma; App Router usa o `loading.tsx` do segmento | n (default) |
| Ícones | `lucide-react` (já dependência) substitui todos os emojis decorativos da área logada | Consistência com shell/landing; emoji renderiza diferente por plataforma | n (default) |
| Cores do gráfico Recharts | Via tokens/paleta derivada dos tokens (skill dataviz na execução), nunca hex hardcoded | AD-017/SHELL-13: tokens são a única fonte de cor | n (default) |
| Teste de contraste | Pares de cor novos (se houver) entram em `theme-contrast.test.ts` | Padrão do item 7: AA verificado par a par nos dois temas | n (default) |

**Open questions:** none — todas resolvidas com o usuário ou registradas acima como default com rationale.

---

## User Stories

### P1: Fundação de estados e primitivos compartilhados ⭐ MVP

**User Story**: Como usuário do Prumo, quero que carregamento, erro e listas vazias tenham sempre a mesma cara calma e clara, para nunca encarar tela branca, erro técnico cru ou vazios inconsistentes.

**Why P1**: Todas as páginas dependem destes primitivos; sem eles o polish por página duplicaria padrões.

**Acceptance Criteria**:

1. WHEN qualquer rota de `/app` está carregando dados no servidor THEN o sistema SHALL exibir o skeleton daquela rota (`loading.tsx` presente em `/app`, `/app/transactions`, `/app/commitments`, `/app/categories`, `/app/projections`), aproximando a forma da página real.
2. WHEN um erro não tratado ocorre em qualquer página de `/app` THEN o sistema SHALL exibir o boundary compartilhado com mensagem pt-BR calma (sem stack trace nem jargão) e um botão "Tentar novamente" que rechama a rota (`reset()`).
3. WHEN uma lista de qualquer página está vazia THEN o sistema SHALL renderizar o componente compartilhado de estado vazio (ícone + título + descrição + ação primária quando aplicável), com o mesmo padrão visual em todas as páginas.
4. WHEN os primitivos são usados THEN o sistema SHALL obter toda cor exclusivamente dos tokens de `globals.css` (zero classes de paleta hardcoded).

**Independent Test**: Com o servidor derrubando a conexão do banco, navegar para `/app/transactions` mostra o error boundary com retry; com usuário sem dados, cada página mostra o empty state compartilhado; throttling de rede mostra o skeleton da rota.

---

### P1: Dashboard reestruturado ⭐ MVP

**User Story**: Como usuário, quero abrir o dashboard e ver em segundos o número que importa — meu saldo do mês — e agir rápido (registrar uma transação ou compromisso), para conferir se estou "no prumo" sem procurar nada.

**Why P1**: É a primeira tela após o login e a maior distância entre estado atual (saudação centralizada + botões emoji) e a barra de craft.

**Acceptance Criteria**:

1. WHEN o dashboard renderiza THEN o saldo projetado do mês atual SHALL ser o elemento mais proeminente da página (estilo Display do DESIGN.md, numerais tabulares, único número-herói do viewport), com a saudação reduzida a papel secundário.
2. WHEN o saldo projetado é negativo THEN o sistema SHALL exibi-lo na cor semântica Saída/negativo; WHEN positivo, na cor de texto primária ou Entrada conforme DESIGN.md (semântica só em número).
3. WHEN o dashboard renderiza THEN os 4 botões de navegação por emoji SHALL não existir mais, substituídos por atalhos de ação "+ Nova transação" e "+ Novo compromisso".
4. WHEN o usuário aciona "+ Nova transação" (ou "+ Novo compromisso") THEN o formulário de criação correspondente SHALL abrir, e ao salvar com sucesso o dado SHALL refletir nos números do dashboard.
5. WHEN os cards de gastos por categoria e próximos vencimentos renderizam THEN eles SHALL seguir o padrão de card do DESIGN.md (superfície elevada, sem sombra em repouso, título de seção, valores tabulares alinhados à direita) e o gráfico SHALL usar apenas cores derivadas dos tokens.
6. WHEN o usuário não tem nenhum dado no mês THEN o dashboard SHALL mostrar R$ 0,00 no herói e empty states com ação primária nos cards (nunca área em branco).

**Independent Test**: Login com usuário com dados → saldo-herói correto e proeminente; clicar "+ Nova transação", salvar, ver números atualizados. Login com usuário zerado → herói R$ 0,00 + empty states.

---

### P1: Polish das páginas de dados (transações, compromissos, categorias, projeções) ⭐ MVP

**User Story**: Como usuário, quero que as páginas de dados tenham hierarquia clara, números alinhados e densidade calibrada, para escanear e planejar com conforto tanto no celular quanto no desktop.

**Why P1**: É o corpo do roadmap item 9 — o polish propriamente dito.

**Acceptance Criteria**:

1. WHEN qualquer uma das 4 páginas renderiza THEN todo valor monetário SHALL usar numerais tabulares, formatação exclusivamente via helpers de `shared` (AD-008) e alinhamento à direita em contexto de coluna/lista (Número Alinhado Rule).
2. WHEN qualquer uma das 4 páginas renderiza THEN a hierarquia tipográfica SHALL seguir o DESIGN.md (título de página Headline, títulos de seção/card Title, corpo Body, rótulos Label) com cabeçalho de página consistente entre as 4.
3. WHEN entradas e saídas aparecem em listas THEN as cores semânticas Entrada/Saída SHALL colorir apenas valores, deltas e estados de parcela — nunca fundos, ícones decorativos ou títulos.
4. WHEN as páginas renderizam em qualquer tema THEN nenhuma classe de cor de paleta hardcoded SHALL existir nos componentes de `/app` e dos módulos de UI (`text-gray-*`, `bg-zinc-*`, `text-red-*`, `text-green-*` etc.) — só tokens.
5. WHEN a página de compromissos exibe um compromisso THEN o progresso de quitação (parcelas pagas / total) SHALL ser legível de relance, com estados de parcela (prevista/paga) visualmente distintos dentro das regras semânticas.
6. WHEN a página de projeções exibe meses THEN a navegação entre meses e o resumo SHALL seguir o mesmo padrão de card/tipografia das demais páginas.
7. WHEN modais e diálogos existentes (criar/editar/excluir) abrem THEN eles SHALL estar alinhados ao design system (tipografia, botões, espaçamento), preservando comportamento e textos funcionais.

**Independent Test**: Percorrer as 4 páginas com dados de exemplo nos dois temas; conferir alinhamento numérico, hierarquia e ausência de cor fora de token (grep + inspeção visual).

---

### P1: Responsividade e acessibilidade das duas cenas ⭐ MVP

**User Story**: Como usuário no celular em um momento curto, quero conferir e marcar coisas sem zoom nem scroll lateral, com a mesma qualidade da experiência desktop.

**Why P1**: "Duas cenas, mesma dignidade" é princípio de produto; o MVP foi construído desktop-first.

**Acceptance Criteria**:

1. WHEN qualquer página de `/app` renderiza em viewport ≥320px THEN o body SHALL não ter scroll horizontal, e conteúdo largo (tabelas/listas) SHALL se adaptar ou rolar no próprio container.
2. WHEN elementos interativos renderizam em viewport mobile THEN alvos de toque SHALL ter ≥44px na dimensão crítica.
3. WHEN as páginas renderizam nos temas claro e escuro THEN todos os pares texto/fundo em uso SHALL cumprir WCAG AA (≥4.5:1 normal, ≥3:1 grande/UI), com pares novos adicionados a `theme-contrast.test.ts`.
4. WHEN o usuário navega por teclado THEN toda ação das páginas (atalhos, edição, exclusão, paginação, navegação de mês) SHALL ser alcançável e operável com indicador de foco visível.

**Independent Test**: Playwright em viewport 320px e 1280px sobre as 5 páginas; teste de contraste automatizado verde nos dois temas.

---

### P2: Passes de qualidade do impeccable

**User Story**: Como time do produto, quero cada página auditada pelos passes `critique`/`polish`/`harden` do impeccable, para que o resultado atinja a barra declarada e fique registrado.

**Why P2**: Eleva de "conforme" para "impecável"; depende de todas as P1 prontas.

**Acceptance Criteria**:

1. WHEN a implementação de cada página conclui THEN o detector mecânico do impeccable SHALL reportar zero findings nos alvos alterados.
2. WHEN os passes rodam THEN cada achado acionável SHALL ser corrigido ou registrado com justificativa (nenhum achado silenciosamente ignorado).

**Independent Test**: `node .../detect.mjs --json <alvos>` retorna vazio; registro dos passes na documentação da feature.

---

## Edge Cases

- WHEN o saldo projetado é negativo THEN o herói do dashboard SHALL usar a cor semântica de negativo sem quebrar o layout (sinal "−" incluído na largura tabular).
- WHEN nomes de categoria/descrição são longos THEN listas e cards SHALL truncar com reticências sem quebrar o alinhamento das colunas de valores.
- WHEN o gráfico de gastos tem 1 única categoria ou muitas (>8) THEN ele SHALL permanecer legível (sem legenda ilegível nem cores repetidas indistinguíveis).
- WHEN a paginação de transações tem muitas páginas THEN o controle SHALL permanecer utilizável em 320px.
- WHEN o banco de dados está indisponível THEN qualquer página de `/app` SHALL cair no error boundary compartilhado (nunca tela branca ou stack trace).
- WHEN o usuário recém-cadastrado abre cada página THEN cada uma SHALL mostrar seu empty state com ação primária clara (nunca layout colapsado).

## Implicit-Requirement Dimensions (sweep)

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | N/A — nenhum input novo; formulários existentes mantêm validação Zod atual |
| Failure / partial-failure states | Coberto: error boundary compartilhado (P1-Fundação AC2, edge case de banco indisponível) |
| Idempotency / retry / duplicate handling | Coberto: "Tentar novamente" via `reset()` re-renderiza a rota (leitura idempotente); mutações não mudam |
| Auth boundaries & rate limits | N/A — páginas já protegidas pelo layout de `/app`; nenhuma action nova |
| Concurrency / ordering | N/A — feature de apresentação; dados lidos em um único render server-side |
| Data lifecycle / expiry | N/A — nenhum dado novo persistido |
| Observability | N/A because não há infra de observabilidade no projeto; error boundary do Next já loga no server — instrumentação é fase futura |
| External-dependency failure | Coberto: indisponibilidade do PostgreSQL cai no error boundary (única dependência externa das páginas) |
| State-transition integrity | N/A — nenhuma transição de estado de domínio nova; estados de UI (modal aberto/fechado) preservados dos módulos |

---

## Requirement Traceability

| Requirement ID | Story | Task(s) | Status |
| -------------- | ----- | ------- | ------ |
| POLISH-01 | P1 Fundação — skeletons por rota (5× `loading.tsx`) | T6 | ❌ Needs Fix |
| POLISH-02 | P1 Fundação — error boundary compartilhado com retry | T5 | ✅ Verified |
| POLISH-03 | P1 Fundação — EmptyState compartilhado em todas as listas | T2, T12 | ✅ Verified |
| POLISH-04 | P1 Fundação/Páginas — zero cor fora de tokens em `/app` + módulos UI | T4, T10, T12, T15 | ✅ Verified |
| POLISH-05 | P1 Dashboard — saldo-herói Display tabular | T7, T9 | ✅ Verified |
| POLISH-06 | P1 Dashboard — semântica de cor no saldo (negativo/positivo) | T7 | ✅ Verified |
| POLISH-07 | P1 Dashboard — navegação por emoji removida, atalhos de criação no lugar | T8, T9 | ✅ Verified |
| POLISH-08 | P1 Dashboard — atalho abre formulário; sucesso reflete nos números | T8, T9 | ✅ Verified |
| POLISH-09 | P1 Dashboard — cards + gráfico conformes (tokens, sem sombra em repouso) | T4, T9 | ✅ Verified |
| POLISH-10 | P1 Dashboard — estado zerado (herói R$ 0,00 + empty states) | T9 | ✅ Verified |
| POLISH-11 | P1 Páginas — Número Alinhado Rule em todas as listas/colunas | T3, T10, T11, T12, T13 | ✅ Verified |
| POLISH-12 | P1 Páginas — hierarquia tipográfica + cabeçalho de página consistente | T3, T10, T11, T12, T13 | ✅ Verified |
| POLISH-13 | P1 Páginas — Semântica Só em Número Rule | T3, T10, T11, T12, T13 | ✅ Verified |
| POLISH-14 | P1 Páginas — progresso de quitação legível em compromissos | T11 | ✅ Verified |
| POLISH-15 | P1 Páginas — projeções no mesmo padrão (navegador de mês + resumo) | T13 | ✅ Verified |
| POLISH-16 | P1 Páginas — modais/diálogos alinhados ao DS, comportamento preservado | T10, T11 | ✅ Verified |
| POLISH-17 | P1 Responsivo — ≥320px sem scroll horizontal do body | T14 | ✅ Verified |
| POLISH-18 | P1 Responsivo — alvos de toque ≥44px | T14 | ⚠️ Partial (ver validation.md) |
| POLISH-19 | P1 A11y — AA nos dois temas, pares novos no teste de contraste | T15 | ✅ Verified |
| POLISH-20 | P1 A11y — operável por teclado com foco visível | T14 | ❌ Needs Fix |
| POLISH-21 | P2 Qualidade — detector impeccable zero findings nos alvos | T16 | ✅ Verified |
| POLISH-22 | P2 Qualidade — passes critique/polish/harden registrados | T16 | ✅ Verified |

**ID format:** `POLISH-NN`. **Status:** Pending → In Design → In Tasks → Implementing → Verified.

**Coverage:** 22 total, 22 mapeados a tasks, 0 unmapped.

---

## Success Criteria

- [ ] Grep de classes de paleta hardcoded em `src/app/app` + `src/modules/*/components` retorna vazio.
- [ ] Detector do impeccable sem findings nos alvos alterados.
- [ ] Gates verdes: typecheck, lint (0 errors), unit (baseline 222 mantido + novos), integration (baseline 156 mantido), e2e completo (suítes existentes verdes; dashboard ajustado aos atalhos; novos testes de estados/atalhos), build.
- [ ] Teste de contraste verde nos dois temas incluindo pares novos.
- [ ] Usuário zerado e usuário com dados têm experiência completa (empty states/loading/erro) em todas as 5 páginas, nos dois temas, em 320px e 1280px.
