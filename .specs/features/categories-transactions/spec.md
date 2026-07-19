# Categorias + Transações Avulsas Specification

**Feature**: `categories-transactions` — Roadmap item 3
**Módulos tocados**: `categories` (novo domínio completo), `transactions` (novo domínio completo), `src/app` (páginas de composição), `prisma/` (migrations), `shared` (sem mudança de API prevista — consome `Money`/`formatBRL` existentes)
**APIs públicas alteradas**: `categories/index.ts` e `transactions/index.ts` deixam de ser placeholders e passam a exportar tipos, schemas, actions e componentes (detalhado no Design)

## Problem Statement

O Prumo tem autenticação funcionando, mas nenhum dado financeiro: o usuário entra e não tem o que fazer. Categorias e transações avulsas são a base de todo o resto do MVP — compromissos (item 4) classificam parcelas por categoria, projeções (item 5) agregam transações por mês e o dashboard (item 6) agrupa gastos por categoria. Sem este item, nada adiante pode ser construído.

## Goals

- [ ] Todo usuário autenticado tem categorias padrão disponíveis imediatamente, separadas por tipo (entrada/saída), sem nenhuma ação de setup.
- [ ] Usuário consegue criar categorias personalizadas, visíveis somente para ele.
- [ ] Usuário consegue registrar entradas e saídas avulsas (data, valor, descrição, categoria) com valores em centavos (AD-008) e validação Zod na fronteira (AD-003).
- [ ] Usuário vê suas transações em uma listagem ordenada por data, com valores formatados em BRL.
- [ ] Nenhum dado (categoria personalizada ou transação) vaza entre usuários (AD-012), coberto por testes de integração.
- [ ] E2E cobre: criar transação de entrada e de saída e vê-las na listagem.

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Reason |
| ------- | ------ |
| Edição e exclusão de transações | Roadmap item 3 pede cadastro + listagem; CRUD completo fica para iteração futura (registrado em Deferred) |
| Edição, exclusão e arquivamento de categorias (padrão ou personalizadas) | Evita decidir agora o efeito cascata sobre transações já classificadas; fica para iteração futura |
| Filtros, busca e agrupamento na listagem (por período, categoria, tipo) | Visão por mês chega com `projections` (item 5); MVP lista ordenado por data |
| Transações recorrentes / parceladas | Roadmap item 4 (`commitments`) |
| Orçamento (limite de gasto) por categoria | Fora do MVP |
| Ícones/cores customizados por categoria | Estética não essencial ao MVP; categorias são texto |
| Importação de transações (CSV, Open Finance) | Fase futura do roadmap |
| Anexos/comprovantes em transações | Fora do MVP |
| E2E de isolamento com 2 contas | Roadmap aloca esse E2E no item 5 (`projections`); aqui o isolamento é coberto por testes de integração (AD-012) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Modelo das categorias padrão | Registros globais (sem `userId`), criados por seed idempotente, compartilhados por todos os usuários e imutáveis no MVP | Evita duplicar N linhas por usuário no signup; imutabilidade elimina o problema de "editar categoria padrão afeta todos" | n |
| Categoria tem tipo | Toda categoria é de `entrada` OU `saida`; o seletor de categoria da transação só exibe categorias do tipo correspondente e o servidor rejeita mismatch | Impede classificar salário como "Alimentação"; simplifica agregação por categoria no dashboard (item 6) | n |
| Conjunto de categorias padrão | Saída: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Assinaturas e serviços, Outros. Entrada: Salário, Renda extra, Investimentos, Outros | Cobertura típica de finanças pessoais BR sem excesso; "Outros" garante que nenhuma transação fica sem categoria possível | n |
| Categoria é obrigatória na transação | Sim — toda transação referencia exatamente 1 categoria | Roadmap define transação como "data, valor, descrição, categoria"; "Outros" cobre o caso sem categoria óbvia | n |
| Nome de categoria personalizada | Trim + obrigatório, 1–40 caracteres; único (case-insensitive) entre as personalizadas do próprio usuário e diferente dos nomes padrão do mesmo tipo | Evita picker com duplicatas confusas ("Alimentação" 2x); 40 chars cabe na UI | n |
| Valor da transação | Inteiro em centavos (AD-008), estritamente > 0, máximo R$ 10.000.000,00 (10^9 centavos); o tipo entrada/saída vive em campo próprio, nunca no sinal do valor | Sinal no valor gera bugs de dupla negação; teto protege o `Int` do Prisma (máx ~R$ 21,4M) com folga | n |
| Data da transação | Somente data (sem hora/timezone), formato `YYYY-MM-DD`; passado e futuro permitidos, entre 2000-01-01 e 100 anos à frente | Projeções (item 5) exigem lançamentos futuros ("entradas previstas"); date-only elimina bugs de fuso na virada de mês; limites barram typos (ano 0202) | n |
| Descrição | Trim + obrigatória, 1–140 caracteres | Roadmap a inclui no cadastro; 140 força concisão e protege a listagem | n |
| Ordenação da listagem | Data decrescente; empate de data desenhado por criação mais recente primeiro | "O que aconteceu por último" é a expectativa natural; critério de desempate determinístico é exigência para paginação estável | n |
| Paginação da listagem | Paginada em blocos de 20 com carregamento incremental ("carregar mais") | Lista não pode ser ilimitada; 20 é suficiente para o MVP sem infra de busca | n |
| Rotas | `/app/transactions` (listagem + acesso ao cadastro) e `/app/categories` (categorias padrão + personalizadas + criação) | Paths em inglês (AD-014), sob `/app` que já é protegido pelo proxy da feature auth | n |
| Posição do formulário de transação (página dedicada vs. modal/inline) | A decidir no Design (discrição do agente) | Não altera comportamento observável dos ACs; decisão de UX de baixo risco | n |
| Idioma da UI | pt-BR | Padrão do produto, consistente com auth | y (AD-014) |

**Open questions:** none — todas as ambiguidades resolvidas acima como assumptions (defaults escolhidos autonomamente; revisar coluna "Confirmed?" antes do Design).

---

## User Stories

### P1: Categorias padrão prontas para uso ⭐ MVP

**User Story**: Como usuário autenticado, quero ter categorias comuns já disponíveis, para classificar minhas transações sem precisar configurar nada antes.

**Why P1**: Sem categorias disponíveis, o cadastro de transação (que exige categoria) trava na primeira utilização.

**Acceptance Criteria**:

1. WHEN um usuário recém-cadastrado acessa qualquer seletor de categorias THEN o sistema SHALL exibir as categorias padrão de saída (Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Assinaturas e serviços, Outros) e de entrada (Salário, Renda extra, Investimentos, Outros), sem nenhuma ação prévia do usuário.
2. WHEN o seed de categorias padrão é executado mais de uma vez (novo deploy, ambiente de teste) THEN o sistema SHALL manter exatamente um registro por categoria padrão (idempotência), sem duplicatas.
3. WHEN o usuário acessa `/app/categories` THEN o sistema SHALL listar as categorias padrão separadas por tipo (entrada/saída) e identificadas como padrão.

**Independent Test**: Criar conta nova, abrir `/app/categories` → todas as categorias padrão visíveis nos dois tipos; rodar o seed 2x → sem duplicatas no banco.

---

### P1: Criar categoria personalizada ⭐ MVP

**User Story**: Como usuário, quero criar minhas próprias categorias, para classificar transações do meu jeito quando as padrão não bastarem.

**Why P1**: Requisito explícito do roadmap ("categorias padrão + personalizadas por usuário").

**Acceptance Criteria**:

1. WHEN o usuário acessa `/app/categories` THEN o sistema SHALL exibir um formulário de criação com nome e tipo (entrada ou saída).
2. WHEN o usuário submete nome válido (1–40 caracteres após trim) e tipo THEN o sistema SHALL criar a categoria vinculada ao seu usuário e exibi-la na listagem de `/app/categories` junto às demais do mesmo tipo.
3. WHEN o nome submetido, após trim e ignorando maiúsculas/minúsculas, já existe entre as categorias personalizadas do próprio usuário OU entre as categorias padrão do mesmo tipo THEN o sistema SHALL rejeitar a criação indicando nome já em uso.
4. WHEN o nome submetido é vazio/só espaços ou excede 40 caracteres THEN o sistema SHALL rejeitar a submissão indicando a regra do campo.
5. WHEN a validação client-side é contornada THEN o sistema SHALL rejeitar entradas inválidas na fronteira server-side com Zod (AD-003).
6. WHEN o usuário A cria uma categoria personalizada THEN o sistema SHALL NOT exibi-la para o usuário B em nenhuma listagem ou seletor (AD-012).

**Independent Test**: Criar categoria "Pets" (saída) → aparece em `/app/categories` e no seletor de transações de saída; tentar criar "pets" de novo → erro de duplicidade; logar com outra conta → "Pets" não existe.

---

### P1: Registrar transação avulsa (entrada ou saída) ⭐ MVP

**User Story**: Como usuário, quero registrar uma entrada ou saída com data, valor, descrição e categoria, para centralizar minhas movimentações financeiras no Prumo.

**Why P1**: É o núcleo do item 3 do roadmap e a fonte de dados de projeções e dashboard.

**Acceptance Criteria**:

1. WHEN o usuário aciona o cadastro de transação a partir de `/app/transactions` THEN o sistema SHALL exibir formulário com: tipo (entrada/saída), data, valor, descrição e categoria.
2. WHEN o usuário seleciona o tipo (entrada ou saída) THEN o sistema SHALL exibir no seletor de categoria somente categorias daquele tipo (padrão + personalizadas do próprio usuário).
3. WHEN o usuário submete o formulário com todos os campos válidos THEN o sistema SHALL persistir a transação vinculada ao seu usuário, com valor em centavos inteiros (AD-008), e exibi-la na listagem.
4. WHEN o valor submetido é zero, negativo, não numérico ou maior que R$ 10.000.000,00 THEN o sistema SHALL rejeitar a submissão indicando a regra do campo.
5. WHEN a data submetida é inválida, anterior a 2000-01-01 ou além de 100 anos no futuro THEN o sistema SHALL rejeitar a submissão indicando a regra do campo.
6. WHEN a data submetida é futura (dentro do limite) THEN o sistema SHALL aceitar a transação (lançamentos previstos são casos de uso legítimos para projeções — item 5).
7. WHEN a descrição, após trim, é vazia ou excede 140 caracteres THEN o sistema SHALL rejeitar a submissão indicando a regra do campo.
8. WHEN a categoria submetida não existe, não é visível para o usuário (personalizada de outro usuário) ou tem tipo diferente do tipo da transação THEN o sistema SHALL rejeitar a submissão na fronteira server-side.
9. WHEN a validação client-side é contornada THEN o sistema SHALL rejeitar entradas inválidas na fronteira server-side com Zod (AD-003).

**Independent Test**: Registrar "Salário — R$ 5.000,00 — hoje — Salário (entrada)" e "Mercado — R$ 250,37 — hoje — Alimentação (saída)" → ambas aparecem na listagem; repetir com cada violação de campo → erro correspondente e nada persistido.

---

### P1: Listar transações ⭐ MVP

**User Story**: Como usuário, quero ver minhas transações em ordem cronológica, para acompanhar o que entrou e saiu.

**Why P1**: Cadastro sem listagem não é verificável pelo usuário; o E2E do roadmap exige ver as transações criadas.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/app/transactions` THEN o sistema SHALL listar suas transações ordenadas por data decrescente (desempate: criação mais recente primeiro), exibindo data, descrição, categoria, tipo e valor formatado em BRL via `formatBRL` do `shared` (AD-008).
2. WHEN a listagem exibe uma entrada e uma saída THEN o sistema SHALL distingui-las visualmente (entrada e saída não podem ser confundidas entre si).
3. WHEN o usuário não tem nenhuma transação THEN o sistema SHALL exibir um estado vazio com orientação para criar a primeira transação (nunca uma tela quebrada ou em branco).
4. WHEN o usuário tem mais de 20 transações THEN o sistema SHALL exibir as 20 primeiras (na ordenação definida) e permitir carregar as próximas incrementalmente.
5. WHEN o usuário A acessa a listagem THEN o sistema SHALL NOT exibir nenhuma transação do usuário B (AD-012).

**Independent Test**: Com 25 transações criadas, abrir `/app/transactions` → 20 visíveis na ordem correta, carregar mais → +5; conta nova → estado vazio.

---

### P2: E2E do fluxo de transações

**User Story**: Como mantenedor, quero um teste E2E cobrindo criar entrada + criar saída + ver ambas na listagem, para garantir o fluxo crítico no CI antes de qualquer deploy.

**Why P2**: Exigência do roadmap item 3 e de AD-011; é P2 apenas porque depende das P1 estarem prontas — mas é obrigatório para a feature ser considerada concluída.

**Acceptance Criteria**:

1. WHEN a suíte E2E roda no CI THEN o sistema SHALL passar no fluxo: login → criar transação de entrada → criar transação de saída → ambas visíveis na listagem com descrição, categoria e valor BRL corretos.
2. WHEN o fluxo E2E cria dados THEN o teste SHALL usar conta e dados próprios, sem depender de estado deixado por outros testes (AD-011).

**Independent Test**: `pnpm test:e2e` verde no CI com o novo spec de transações.

---

## Edge Cases

- WHEN duas criações de categoria personalizada com o mesmo nome (mesmo usuário, mesmo tipo) são submetidas concorrentemente THEN o sistema SHALL garantir que apenas uma sucede (unicidade por constraint no banco, não só por verificação prévia).
- WHEN o valor é digitado com máscara BRL (`1.234,56`) THEN o sistema SHALL converter para centavos inteiros (123456) antes de validar e persistir — nunca float em nenhuma camada (AD-008).
- WHEN campos de texto recebem espaços nas bordas THEN o sistema SHALL fazer trim antes de validar (nome de categoria, descrição).
- WHEN o usuário submete uma transação referenciando uma categoria personalizada que acabou de ser criada por ele THEN o sistema SHALL aceitá-la (categorias recém-criadas são imediatamente utilizáveis).
- WHEN um request malicioso envia `userId` de outro usuário no payload THEN o sistema SHALL ignorar qualquer `userId` do payload e usar exclusivamente o usuário da sessão autenticada (AD-012).
- WHEN um usuário não autenticado acessa `/app/transactions` ou `/app/categories` THEN o sistema SHALL redirecioná-lo para `/login` (proteção herdada do proxy de `/app` — feature auth).
- WHEN a transação tem valor nos limites (R$ 0,01 e R$ 10.000.000,00 exatos) THEN o sistema SHALL aceitá-la (limites são inclusivos).
- WHEN o nome de categoria contém caracteres não-ASCII válidos (acentos, emoji) THEN o sistema SHALL aceitá-lo dentro do limite de 40 caracteres.

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Coberto: valor (>0, ≤ R$10M, centavos), data (janela 2000→+100 anos, date-only), descrição (1–140), nome de categoria (1–40, unicidade), tipo/categoria match, trim, Zod server-side |
| Failure / partial-failure states | Coberto: cada cadastro é escrita única e atômica (uma linha); falha de validação não persiste nada. Sem orquestração multi-passo nesta feature |
| Idempotency / retry / duplicates | Coberto: seed de categorias padrão idempotente (AC 2 da story 1); unicidade de nome de categoria por constraint. Transações duplicadas idênticas são permitidas (duas compras iguais no mesmo dia são legítimas) |
| Auth boundaries & rate limits | Boundaries cobertos: rotas sob `/app` protegidas (proxy da feature auth); actions exigem sessão; `userId` sempre da sessão, nunca do payload. Rate limiting: N/A because operações autenticadas de baixo risco, sem superfície de enumeração |
| Concurrency / ordering | Coberto: criação concorrente de categoria com mesmo nome (edge case, constraint); ordenação determinística da listagem com critério de desempate |
| Data lifecycle / expiry | N/A because não há exclusão/arquivamento nesta feature (out of scope registrado); dados vivem indefinidamente no MVP |
| Observability | N/A because MVP usa logs padrão do framework; sem requisito adicional desta feature |
| External-dependency failure | N/A because a feature não consome nenhuma API externa (só banco próprio) |
| State-transition integrity | N/A because transações e categorias não têm máquina de estados nesta feature (status de parcela chega no item 4) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAT-01 | P1: Categorias padrão (seed global idempotente, disponível a todo usuário) | Design | Pending |
| CAT-02 | P1: Categorias padrão (listagem em `/app/categories` separada por tipo) | Design | Pending |
| CAT-03 | P1: Categoria personalizada (criação com nome 1–40 + tipo) | Design | Pending |
| CAT-04 | P1: Categoria personalizada (unicidade case-insensitive por usuário/tipo, incl. vs. padrão, constraint no banco) | Design | Pending |
| CAT-05 | P1: Categoria personalizada (validação Zod server-side na fronteira) | Design | Pending |
| CAT-06 | P1: Categoria personalizada (isolamento por usuário — AD-012) | Design | Pending |
| TXN-01 | P1: Registrar transação (formulário tipo/data/valor/descrição/categoria) | Design | Pending |
| TXN-02 | P1: Registrar transação (seletor de categoria filtrado por tipo) | Design | Pending |
| TXN-03 | P1: Registrar transação (persistência em centavos + vínculo ao usuário da sessão) | Design | Pending |
| TXN-04 | P1: Registrar transação (validações: valor, data, descrição, categoria válida/visível/tipo-correto) | Design | Pending |
| TXN-05 | P1: Registrar transação (validação Zod server-side na fronteira) | Design | Pending |
| TXN-06 | P1: Listar transações (ordenação data desc + desempate, BRL via shared, distinção visual entrada/saída) | Design | Pending |
| TXN-07 | P1: Listar transações (estado vazio + paginação de 20 incremental) | Design | Pending |
| TXN-08 | P1: Listar transações (isolamento por usuário — AD-012) | Design | Pending |
| TXN-09 | P2: E2E (login → criar entrada → criar saída → ambas na listagem) | Design | Pending |

**ID format:** `CAT-NN` (módulo categories), `TXN-NN` (módulo transactions)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 15 total, 0 mapped to tasks, 15 unmapped ⚠️ (esperado — Tasks ainda não gerado)

---

## Success Criteria

- [ ] Uma conta recém-criada consegue, usando apenas a UI: ver categorias padrão, criar uma categoria personalizada, registrar uma entrada e uma saída e vê-las listadas em BRL — em produção.
- [ ] Zero transações persistidas com valor ≤ 0, valor em float, descrição vazia, data fora da janela ou categoria inválida/de outro usuário (verificado por testes de integração da fronteira).
- [ ] Zero categorias ou transações de um usuário visíveis para outro (verificado por testes de integração com dois usuários — AD-012).
- [ ] Soma dos testes da feature verde no CI: unitários (domain), integração (data + actions) e o novo E2E de transações.
- [ ] Nenhuma violação de fronteira de módulos: `transactions` consome `categories` apenas via `index.ts` (AD-010) — lint verde.
