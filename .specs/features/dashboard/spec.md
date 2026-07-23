# Dashboard — Specification

> Roadmap item 6 (último item do MVP). Composição em `app/` — consome APIs públicas de `projections`, `transactions` e `commitments`; não introduz um novo módulo de domínio (AD-010, AD-016).

## Problem Statement

Hoje `/app` é só uma tela de boas-vindas com 4 cards de navegação. O usuário precisa entrar em cada módulo (transações, compromissos, projeções) para montar mentalmente o quadro do mês atual. O dashboard resolve isso: ao logar, o usuário já vê o essencial do mês corrente — saldo, para onde o dinheiro está indo e o que vence em breve — sem navegar.

## Goals

- [ ] `/app` mostra o resumo do mês atual (entradas, saídas, saldo) reaproveitando a fórmula já validada de `projections`
- [ ] Gráfico de gastos por categoria do mês atual (Recharts, AD-004), combinando transações avulsas de saída e parcelas de compromissos
- [ ] Lista de parcelas não pagas com vencimento no mês atual, ordenada por data, com ação de marcar como paga sem sair do dashboard
- [ ] Isolamento por usuário preservado (AD-012) por construção, herdado das funções de agregação já testadas em `transactions`/`commitments`/`projections`

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Navegação entre meses no dashboard | Dashboard é sempre o mês atual (hoje); navegação por mês já existe em `/app/projections` |
| Novo módulo `dashboard` em `src/modules` | Roadmap: "apenas composição em `app/`"; lógica de composição vive em `src/app/app/`, não em um módulo de domínio novo |
| Editar/excluir transações ou compromissos a partir do dashboard | Fora do escopo de "composição"; edição continua nas páginas dos módulos donos |
| Cores de categoria persistidas no banco | `Category` não tem campo `color`; paleta é atribuída em runtime na camada de apresentação |
| "Outros" agrupando categorias pequenas / paginação no gráfico | Volume de categorias por usuário é baixo no MVP; sem necessidade de agrupar |
| Gráfico de entradas por categoria | Usuário optou por mostrar só saídas por categoria no gráfico |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Local do dashboard | Substitui o conteúdo de `/app` (rota existente) | Escolha do usuário | y |
| Escopo do gráfico de categoria | Só saídas: transações tipo `saida` + parcelas com vencimento no mês (mesma regra de "saídas previstas" de `projections`) | Escolha do usuário | y |
| Escopo de "próximos vencimentos" | Parcelas com status `prevista` e vencimento no mês atual, todas (sem limite de quantidade), ordenadas por `dueDate` asc | Escolha do usuário | y |
| Interatividade | Permite marcar parcela como paga direto da lista, reusando `setInstallmentStatusAction` já existente em `commitments` | Escolha do usuário | y |
| Parcelas pagas no gráfico/saldo | Contam nas saídas do mês (mesma regra herdada de `projections`, AD-009/PROJ) | Consistência entre saldo do dashboard e saldo de `projections` no mesmo mês | y |
| "Mês atual" | Mês corrente do servidor no momento do request (`getCurrentMonth()` já existe em `projections`), sem parâmetro de URL | Dashboard é a "visão de hoje"; navegação já é coberta por `/app/projections` | y |
| Cor por categoria no gráfico | Paleta categórica fixa, atribuída por ordem/hash determinístico do `categoryId` (mesma cor sempre para a mesma categoria dentro de uma sessão) | Sem campo `color` no schema; paleta fixa evita nova migration | y |
| Origem do saldo/entradas/saídas do resumo | Reaproveita `getMonthlyProjection(userId, month)` de `projections`, sem recalcular a fórmula | Evita duplicar lógica já testada (`buildMonthlyProjection`) | y |
| Novas agregações necessárias | `transactions` ganha `getMonthlyExpensesByCategory`; `commitments` ganha `getMonthlyInstallmentsByCategory` e `listUnpaidInstallmentsForMonth` — expostas via `index.ts` de cada módulo (AD-016) | Cada módulo dono expõe a agregação; dashboard só compõe | y |
| Cards de navegação atuais | Continuam presentes em `/app`, abaixo do resumo | Não remover funcionalidade existente de navegação para os módulos | y |
| Isolamento entre usuários | Herdado por construção — todas as novas funções de agregação recebem `userId` obrigatório e reusam os repositórios já cobertos por teste de integração/E2E (`transactions`, `commitments`) | AD-012; evitar E2E de 2 contas redundante quando a garantia já vem da camada de dados reusada | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Ver o resumo financeiro do mês atual ⭐ MVP

**User Story**: Como usuário autenticado, quero ver ao entrar no app o saldo, as entradas e as saídas previstas do mês atual, para saber rapidamente a situação financeira do mês sem navegar.

**Why P1**: É o núcleo do dashboard — sem isso não há resumo.

**Acceptance Criteria**:

1. WHEN o usuário autenticado acessa `/app` THEN o sistema SHALL exibir entradas previstas, saídas previstas e saldo projetado do mês corrente, calculados por `getMonthlyProjection` (mesma fórmula de `projections`: saldo = entradas − (saídas avulsas + parcelas do mês))
2. WHEN o mês corrente não tem nenhuma transação nem parcela THEN o sistema SHALL exibir entradas, saídas e saldo como zero (sem erro)
3. WHEN o saldo projetado é negativo THEN o sistema SHALL exibir o valor negativo formatado em BRL (AD-008), sem ocultar ou truncar

**Independent Test**: Criar transações/parcelas para o mês atual, acessar `/app`, e conferir que os 3 valores batem com os mesmos valores mostrados em `/app/projections` para o mês corrente.

---

### P1: Ver gastos por categoria do mês atual ⭐ MVP

**User Story**: Como usuário autenticado, quero ver um gráfico de quanto gastei em cada categoria no mês atual, para entender para onde meu dinheiro está indo.

**Why P1**: É o segundo pilar do resumo pedido no roadmap.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/app` THEN o sistema SHALL exibir um gráfico (Recharts) com o total gasto por categoria no mês corrente, somando transações tipo `saida` e parcelas de `commitments` com vencimento no mês, agrupadas por `categoryId`
2. WHEN uma categoria não tem nenhum gasto (transação ou parcela) no mês THEN o sistema SHALL omiti-la do gráfico
3. WHEN nenhuma categoria tem gasto no mês (mês vazio) THEN o sistema SHALL exibir um estado vazio no lugar do gráfico (ex.: "Nenhum gasto neste mês"), sem erro nem gráfico quebrado
4. WHEN o mesmo `categoryId` tem gasto em transações avulsas e em parcelas THEN o sistema SHALL somar os dois valores em uma única fatia/barra da categoria

**Independent Test**: Lançar uma transação de saída e uma parcela na mesma categoria no mês atual; conferir que o gráfico mostra uma única entrada para a categoria com a soma dos dois valores.

---

### P1: Ver próximos vencimentos do mês ⭐ MVP

**User Story**: Como usuário autenticado, quero ver quais parcelas ainda não pagas vencem neste mês, para não esquecer de pagá-las.

**Why P1**: Completa o terceiro pilar do resumo do roadmap.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/app` THEN o sistema SHALL listar todas as parcelas com status `prevista` cujo vencimento (`dueDate`) cai no mês corrente, ordenadas por `dueDate` ascendente
2. WHEN uma parcela do mês corrente já está com status `paga` THEN o sistema SHALL NOT incluí-la na lista de próximos vencimentos
3. WHEN não há nenhuma parcela `prevista` no mês corrente THEN o sistema SHALL exibir um estado vazio (ex.: "Nenhuma parcela pendente este mês"), sem erro
4. WHEN a lista é exibida THEN cada item SHALL mostrar descrição do compromisso, categoria, valor da parcela e data de vencimento

**Independent Test**: Criar um compromisso parcelado com vencimento no mês atual; conferir que a parcela aparece na lista; marcar como paga em `/app/commitments`; recarregar `/app` e conferir que ela some da lista.

---

### P2: Marcar parcela como paga direto do dashboard

**User Story**: Como usuário autenticado, quero marcar uma parcela como paga direto da lista de próximos vencimentos, para não precisar ir até `/app/commitments` para uma ação rápida.

**Why P2**: Melhora a experiência mas não é indispensável — a ação já existe em `/app/commitments`; aqui é conveniência.

**Acceptance Criteria**:

1. WHEN o usuário clica na ação de marcar como paga em um item da lista de vencimentos THEN o sistema SHALL chamar `setInstallmentStatusAction` com o `installmentId` correspondente e status `paga`
2. WHEN a ação é concluída com sucesso THEN o sistema SHALL remover o item da lista de próximos vencimentos sem recarregar a página inteira
3. WHEN a ação falha (ex.: erro de rede/servidor) THEN o sistema SHALL manter o item na lista e exibir uma mensagem de erro
4. WHEN uma parcela é marcada como paga pelo dashboard THEN o saldo e o gráfico de categoria do resumo SHALL continuar contando essa parcela nas saídas do mês (mesma regra herdada de `projections`: parcelas pagas contam no mês em que vencem)

**Independent Test**: Marcar uma parcela como paga pela lista do dashboard; conferir que ela some da lista de vencimentos mas o saldo/gráfico do resumo não mudam (a parcela já contava como saída antes de ser paga).

---

## Edge Cases

- WHEN o usuário não tem nenhuma transação, compromisso ou categoria cadastrada THEN o sistema SHALL exibir o dashboard com saldo zero, gráfico vazio e lista de vencimentos vazia — nunca erro 500
- WHEN um compromisso está no modo `fixed_payment` THEN suas parcelas SHALL ser tratadas igual às de `installment_payment` no gráfico e na lista de vencimentos (parcela é parcela, independente do modo)
- WHEN duas categorias diferentes têm nomes iguais (categoria padrão + personalizada com mesmo nome) THEN o gráfico SHALL tratá-las como fatias separadas (agrupamento é por `categoryId`, nunca por nome)
- WHEN a mesma categoria aparece em vários gastos (múltiplas transações/parcelas) THEN o sistema SHALL somar todos antes de agrupar (nunca uma fatia por lançamento)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --------------- | ----------- | ------ | ------- |
| DASH-01 | P1: Resumo do mês | Execute (T6) | Implementing |
| DASH-02 | P1: Resumo do mês (estado vazio) | Execute (T6) | Implementing |
| DASH-03 | P1: Resumo do mês (saldo negativo) | Execute (T6) | Implementing |
| DASH-04 | P1: Gastos por categoria | Execute (T1, T2, T3, T4) | Implementing |
| DASH-05 | P1: Gastos por categoria (omitir zero) | Execute (T1, T3) | Implementing |
| DASH-06 | P1: Gastos por categoria (estado vazio) | Execute (T4) | Implementing |
| DASH-07 | P1: Gastos por categoria (soma avulsa+parcela) | Execute (T1, T2, T3, T6) | Implementing |
| DASH-08 | P1: Próximos vencimentos (listar) | Execute (T2, T5) | Implementing |
| DASH-09 | P1: Próximos vencimentos (excluir pagas) | Execute (T2, T5, T6) | Implementing |
| DASH-10 | P1: Próximos vencimentos (estado vazio) | Execute (T5, T6) | Implementing |
| DASH-11 | P1: Próximos vencimentos (campos exibidos) | Execute (T2, T5) | Implementing |
| DASH-12 | P2: Marcar como paga (chamada da action) | Execute (T5) | Implementing |
| DASH-13 | P2: Marcar como paga (remoção da lista) | Execute (T5, T6) | Implementing |
| DASH-14 | P2: Marcar como paga (erro mantém item) | Execute (T5) | Implementing |
| DASH-15 | P2: Marcar como paga (não afeta saldo/gráfico) | Execute (T6) | Implementing |
| DASH-16 | Edge: dashboard vazio sem erro | Execute (T6) | Implementing |
| DASH-17 | Edge: fixed_payment tratado igual | Execute (T2) | Implementing |
| DASH-18 | Edge: agrupamento por categoryId, não por nome | Execute (T1, T2, T3) | Implementing |

**ID format:** `DASH-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 18 total, 18 mapped to tasks (T1–T6), 0 unmapped

---

## Success Criteria

- [ ] `/app` renderiza saldo, entradas, saídas, gráfico de categoria e lista de vencimentos do mês atual sem erro, para um usuário com dados e para um usuário sem dados
- [ ] Saldo mostrado em `/app` é idêntico ao saldo mostrado em `/app/projections` para o mês corrente (mesma fonte, `getMonthlyProjection`)
- [ ] Marcar parcela como paga pelo dashboard reflete corretamente em `/app/commitments` (mesma fonte de dados, sem duplicação de estado)
- [ ] Isolamento entre usuários preservado — nenhum dado de outro usuário aparece no resumo, gráfico ou lista
