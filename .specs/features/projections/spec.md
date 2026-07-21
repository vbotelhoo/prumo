# Previsibilidade Mensal (`projections`) — Specification

> Roadmap item 5. Módulo somente-leitura sobre `transactions` e `commitments` (AD-010).

## Problem Statement

O usuário já registra transações avulsas e compromissos parcelados, mas não tem visão consolidada de quanto vai entrar, quanto vai sair e quanto do mês já está comprometido com parcelas. Sem isso, não consegue antecipar meses apertados nem planejar compras futuras — o propósito central do Prumo.

## Goals

- [ ] Visão mensal navegável (meses passados, atual e futuros) com 4 agregados: entradas previstas, saídas previstas, saldo projetado e total comprometido
- [ ] Saldo projetado correto por construção: `entradas do mês − (saídas avulsas do mês + parcelas com vencimento no mês)`, calculado em centavos (AD-008), coberto por testes unitários
- [ ] Isolamento por usuário garantido (AD-012), coberto por teste de integração e E2E com 2 contas

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Receitas/despesas recorrentes (ex.: salário mensal automático) | Não existe no MVP; entradas futuras vêm apenas de transações lançadas com data futura |
| Saldo acumulado entre meses (carry-over) | Decisão do usuário: saldo isolado por mês (fórmula do roadmap) |
| Gráficos e composição visual de resumo | Pertencem ao item 6 do roadmap (Dashboard) |
| Editar/criar transações ou compromissos a partir da projeção | `projections` é somente-leitura (AD-010); edição vive nos módulos donos |
| Saldo devedor total dos compromissos | Usuário escolheu "parcelas do mês" como significado de total comprometido |
| Cache/materialização de projeções | Cálculo on-the-fly por mês é suficiente no MVP |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Horizonte de navegação | Livre: passados + atual + futuros | Escolha do usuário na especificação | y |
| Total comprometido | Soma das parcelas com vencimento no mês | Escolha do usuário | y |
| Saldo projetado | Isolado por mês (sem carry-over) | Escolha do usuário; fórmula do roadmap | y |
| Parcelas pagas | Contam nas saídas do mês em que vencem, igual às previstas | Escolha do usuário: projeção reflete o total do mês | y |
| Entradas de meses futuros | Apenas transações `entrada` com data naquele mês (lançadas manualmente com data futura) | Única fonte de entradas existente no MVP | y |
| Meses passados | Mesma fórmula e mesmos rótulos dos demais meses (valores passam a ser "realizados", sem tratamento visual distinto) | Simplicidade; distinção visual fica para o Dashboard | y |
| Seleção do mês | Query param `?month=YYYY-MM` na URL da página | Estado navegável/compartilhável, SSR-friendly, padrão App Router | y |
| Validação do mês | `YYYY-MM` com ano entre 2000 e 2100; inválido/ausente → mês atual | Bound simples que evita datas absurdas sem limitar uso real | y |
| Limite de navegação na UI | Sem limite rígido (botões sempre ativos dentro do range validado) | Queries são escopadas por mês; sem custo em navegar longe | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Ver a projeção do mês ⭐ MVP

**User Story**: Como usuário autenticado, quero ver em um só lugar as entradas previstas, saídas previstas, saldo projetado e total comprometido de um mês, para saber se ele fecha no azul ou no vermelho.

**Why P1**: É a entrega central do item 5 — sem os 4 agregados corretos não há previsibilidade.

**Acceptance Criteria**:

1. WHEN o usuário autenticado acessa `/app/projections` sem query param THEN o sistema SHALL exibir a projeção do mês corrente (fuso de referência: UTC, consistente com datas `YYYY-MM-DD` do sistema)
2. WHEN a projeção de um mês é exibida THEN **entradas previstas** SHALL ser a soma dos `amount` das transações do usuário com `type = "entrada"` e `date` dentro do mês
3. WHEN a projeção de um mês é exibida THEN **saídas previstas** SHALL ser a soma de (a) transações do usuário com `type = "saida"` e `date` no mês, mais (b) parcelas do usuário com `dueDate` no mês, independentemente do status (`prevista` ou `paga`)
4. WHEN a projeção de um mês é exibida THEN **saldo projetado** SHALL ser `entradas previstas − saídas previstas` daquele mês, sem carry-over de meses anteriores
5. WHEN a projeção de um mês é exibida THEN **total comprometido** SHALL ser a soma das parcelas do usuário com `dueDate` no mês (qualquer status)
6. WHEN o saldo projetado é negativo THEN o sistema SHALL exibi-lo com sinal negativo e destaque visual de alerta (ex.: cor de erro do design system)
7. WHEN todos os agregados são exibidos THEN os valores SHALL ser calculados em centavos (inteiros, tipo `Money`) e formatados em BRL pelos helpers de `shared` (AD-008)
8. WHEN um usuário não autenticado acessa `/app/projections` THEN o sistema SHALL redirecionar para `/login` (mesmo comportamento das demais páginas de `/app`)

**Independent Test**: Criar 1 entrada, 1 saída avulsa e 1 parcelamento no mês corrente; abrir `/app/projections` e conferir os 4 valores contra o cálculo manual.

---

### P1: Navegar entre meses ⭐ MVP

**User Story**: Como usuário, quero navegar para meses passados e futuros, para revisar o que aconteceu e antecipar compromissos que ainda vão vencer.

**Why P1**: O roadmap exige "visão por mês (atual e futuros)"; o usuário decidiu incluir passados. Sem navegação a projeção só mostra o presente.

**Acceptance Criteria**:

1. WHEN o usuário aciona "mês anterior" ou "próximo mês" THEN o sistema SHALL exibir a projeção do mês adjacente e refletir o mês em `?month=YYYY-MM` na URL
2. WHEN o usuário acessa `/app/projections?month=YYYY-MM` com valor válido (2000-01 a 2100-12) THEN o sistema SHALL exibir a projeção daquele mês
3. WHEN `?month` é inválido (formato errado ou fora do range) THEN o sistema SHALL exibir o mês corrente (fallback silencioso, sem erro)
4. WHEN o usuário está em um mês diferente do corrente THEN o sistema SHALL oferecer um atalho "voltar ao mês atual"
5. WHEN o mês exibido é qualquer um (passado, atual ou futuro) THEN o sistema SHALL aplicar exatamente a mesma fórmula de agregação (sem regra especial por período)
6. WHEN o mês exibido muda THEN o sistema SHALL exibir o nome do mês e o ano por extenso em pt-BR (ex.: "julho de 2026")

**Independent Test**: Criar um parcelamento de 3x iniciando no mês corrente; navegar para os 2 meses seguintes e ver a parcela correspondente nas saídas/comprometido de cada mês; voltar ao mês atual pelo atalho.

---

### P1: Isolamento entre usuários ⭐ MVP

**User Story**: Como usuário, quero que minha projeção considere apenas os meus dados, para que informações financeiras nunca vazem entre contas.

**Why P1**: AD-012 — falha de segurança mais grave do produto; o roadmap exige E2E com 2 contas.

**Acceptance Criteria**:

1. WHEN a projeção de qualquer mês é calculada THEN o sistema SHALL agregar exclusivamente transações e parcelas do usuário da sessão (todas as queries escopadas por `userId`, AD-012)
2. WHEN dois usuários têm dados no mesmo mês THEN a projeção de cada um SHALL refletir somente os próprios lançamentos (coberto por teste de integração e por E2E com 2 contas)

**Independent Test**: Duas contas com lançamentos distintos no mesmo mês; a projeção de cada conta bate com o cálculo manual dos próprios dados e não inclui nada da outra.

---

### P2: Mês sem movimentação

**User Story**: Como usuário, quero que meses sem lançamentos mostrem claramente que não há nada previsto, para não confundir ausência de dados com erro.

**Why P2**: Estado inevitável em navegação livre (meses distantes), mas não bloqueia o fluxo principal.

**Acceptance Criteria**:

1. WHEN o mês exibido não tem transações nem parcelas THEN o sistema SHALL exibir os 4 agregados como `R$ 0,00` (saldo `R$ 0,00`, sem destaque de alerta)
2. WHEN o mês está zerado THEN o sistema SHALL manter a navegação funcional (sem estado de erro ou página vazia)

**Independent Test**: Navegar para um mês distante sem dados e verificar os 4 cards zerados e navegação ativa.

---

### P2: Acesso pela navegação do app

**User Story**: Como usuário, quero acessar a projeção pela navegação principal do app, para chegar nela sem digitar URL.

**Why P2**: Descobribilidade; padrão já seguido por `transactions` e `commitments`.

**Acceptance Criteria**:

1. WHEN o usuário está em qualquer página de `/app` THEN a navegação SHALL conter um link "Projeções" apontando para `/app/projections`

**Independent Test**: A partir de `/app`, clicar em "Projeções" e chegar à página.

---

## Edge Cases

- WHEN um mês contém apenas parcelas (sem transações avulsas) THEN saídas previstas SHALL igualar o total comprometido e entradas SHALL ser `R$ 0,00`
- WHEN uma parcela vence no primeiro ou no último dia do mês THEN ela SHALL contar naquele mês (fronteiras de mês inclusivas, datas tratadas em UTC — lição dos bugs de `addMonths` em `commitments`)
- WHEN o usuário tem financiamento longo (ex.: 360 parcelas) THEN a navegação para meses distantes SHALL continuar exibindo as parcelas corretas daquele mês
- WHEN transações `entrada` e `saida` do mesmo valor existem no mês THEN o saldo SHALL considerar ambas (sem dedupe por valor)
- WHEN `?month=2100-13` ou `?month=abc` é acessado THEN o sistema SHALL cair no mês corrente sem erro

### Implicit-requirement dimensions sweep (Large)

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | `?month` validado (`YYYY-MM`, 2000–2100) com fallback ao mês corrente — AC P1-Nav 2/3 |
| Failure / partial-failure states | N/A because feature é somente-leitura em banco único; falha de query resulta em erro padrão do Next.js, sem estado parcial a proteger |
| Idempotency / retry / duplicate handling | N/A because não há mutação |
| Auth boundaries & rate limits | Página exige sessão (AC P1-Ver 8); rate limit N/A no MVP (consistente com demais páginas) |
| Concurrency / ordering | N/A because leitura pontual sem escrita concorrente própria |
| Data lifecycle / expiry | N/A because módulo não possui dados próprios (agrega dados de `transactions`/`commitments`) |
| Observability | N/A no MVP — sem logging/métricas específicos, consistente com os demais módulos |
| External-dependency failure | N/A because sem chamadas externas |
| State-transition integrity | N/A because sem estado próprio |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PROJ-01 | P1: Ver a projeção — página autenticada, default mês corrente | Design | Pending |
| PROJ-02 | P1: Ver a projeção — entradas previstas do mês | Design | Pending |
| PROJ-03 | P1: Ver a projeção — saídas previstas (avulsas + parcelas, qualquer status) | Design | Pending |
| PROJ-04 | P1: Ver a projeção — saldo projetado isolado por mês | Design | Pending |
| PROJ-05 | P1: Ver a projeção — total comprometido = parcelas do mês | Design | Pending |
| PROJ-06 | P1: Ver a projeção — saldo negativo com destaque de alerta | Design | Pending |
| PROJ-07 | P1: Ver a projeção — Money em centavos + formatação BRL via shared | Design | Pending |
| PROJ-08 | P1: Ver a projeção — redirect de não autenticado para /login | Design | Pending |
| PROJ-09 | P1: Navegar — mês anterior/próximo refletido em ?month | Design | Pending |
| PROJ-10 | P1: Navegar — ?month válido exibe o mês pedido | Design | Pending |
| PROJ-11 | P1: Navegar — ?month inválido cai no mês corrente | Design | Pending |
| PROJ-12 | P1: Navegar — atalho "voltar ao mês atual" | Design | Pending |
| PROJ-13 | P1: Navegar — mesma fórmula para qualquer mês | Design | Pending |
| PROJ-14 | P1: Navegar — título do mês em pt-BR | Design | Pending |
| PROJ-15 | P1: Isolamento — queries escopadas por userId | Design | Pending |
| PROJ-16 | P1: Isolamento — E2E/integração com 2 contas | Design | Pending |
| PROJ-17 | P2: Mês zerado — 4 agregados R$ 0,00 sem erro | Design | Pending |
| PROJ-18 | P2: Navegação do app — link "Projeções" | Design | Pending |

**Coverage:** 18 total, 0 mapped to tasks, 18 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] E2E verde: usuário cria entrada + saída + parcelamento, abre a projeção e o saldo do mês bate com o cálculo manual (roadmap: "projeção mensal com saldo correto")
- [ ] E2E verde com 2 contas: cada projeção reflete apenas os dados do próprio usuário (roadmap: "isolamento entre usuários")
- [ ] Testes unitários da agregação cobrem a fórmula do saldo, fronteiras de mês e mês zerado, operando só com `Money` em centavos
- [ ] Todos os gates do CI verdes (lint, typecheck, unit, integração, E2E) antes do PR para `main`
