# Categorias + Transações Avulsas Specification

**Feature**: `categories-transactions` — Roadmap item 3
**Módulos tocados**: `categories` (novo domínio completo), `transactions` (novo domínio completo), `src/app` (páginas de composição), `prisma/` (migrations), `shared` (sem mudança de API prevista — consome `Money`/`formatBRL` existentes)
**APIs públicas alteradas**: `categories/index.ts` e `transactions/index.ts` deixam de ser placeholders e passam a exportar tipos, schemas, actions e componentes (detalhado no Design)

## Problem Statement

O Prumo tem autenticação funcionando, mas nenhum dado financeiro: o usuário entra e não tem o que fazer. Categorias e transações avulsas são a base de todo o resto do MVP — compromissos (item 4) classificam parcelas por categoria, projeções (item 5) agregam transações por mês e o dashboard (item 6) agrupa gastos por categoria. Sem este item, nada adiante pode ser construído.

## Goals

- [ ] Todo usuário autenticado tem categorias padrão disponíveis imediatamente, separadas por tipo (entrada/saída), sem nenhuma ação de setup.
- [ ] Usuário consegue criar categorias personalizadas, visíveis somente para ele.
- [ ] Usuário consegue registrar entradas e saídas avulsas (data, valor, descrição opcional, categoria) com valores em centavos (AD-008) e validação Zod na fronteira (AD-003).
- [ ] Usuário vê suas transações em uma listagem ordenada por data com paginação numerada, com valores formatados em BRL.
- [ ] Usuário consegue editar e excluir uma transação (exclusão com confirmação) e a listagem reflete a mudança.
- [ ] Usuário consegue excluir categoria personalizada sem uso, com confirmação digitada ("excluir permanentemente") e aviso de irreversibilidade; categoria em uso tem a exclusão bloqueada.
- [ ] Nenhum dado (categoria personalizada ou transação) vaza entre usuários (AD-012), coberto por testes de integração.
- [ ] E2E cobre: criar transação de entrada e de saída e vê-las na listagem.

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Reason |
| ------- | ------ |
| Edição e arquivamento de categorias | Renomear categoria em uso muda retroativamente o rótulo de transações passadas — decisão de produto para iteração futura; exclusão (bloqueada quando em uso) FOI incluída por decisão do usuário (2026-07-18) |
| Exclusão/edição de categorias padrão | Categorias padrão são globais e imutáveis no MVP (assumption confirmada); só personalizadas são excluíveis |
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

Decisões revisadas e confirmadas pelo usuário em 2026-07-18 (ver `context.md`).

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Modelo das categorias padrão | Registros globais (sem `userId`), criados por seed idempotente, compartilhados por todos os usuários e imutáveis no MVP | Evita duplicar N linhas por usuário no signup; imutabilidade elimina o problema de "editar categoria padrão afeta todos" | y |
| Categoria tem tipo | Toda categoria é de `entrada` OU `saida`; o seletor de categoria da transação só exibe categorias do tipo correspondente e o servidor rejeita mismatch | Impede classificar salário como "Alimentação"; simplifica agregação por categoria no dashboard (item 6) | y |
| Conjunto de categorias padrão | Saída: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Assinaturas e serviços, Outros. Entrada: Salário, Renda extra, Investimentos, Outros | Cobertura típica de finanças pessoais BR sem excesso; "Outros" garante que nenhuma transação fica sem categoria possível. Usuário aprovou o conjunto, reforçando que criação de personalizadas segue disponível (story P1) | y |
| Categoria é obrigatória na transação | Sim — toda transação referencia exatamente 1 categoria | Roadmap define transação como "data, valor, descrição, categoria"; "Outros" cobre o caso sem categoria óbvia | y |
| Nome de categoria personalizada | Trim + obrigatório, 1–40 caracteres; único (case-insensitive) entre as personalizadas do próprio usuário e diferente dos nomes padrão do mesmo tipo | Evita picker com duplicatas confusas ("Alimentação" 2x); 40 chars cabe na UI | y |
| Valor da transação | Inteiro em centavos (AD-008), estritamente > 0, máximo R$ 10.000.000,00 (10^9 centavos); o tipo entrada/saída vive em campo próprio, nunca no sinal do valor | Sinal no valor gera bugs de dupla negação; teto protege o `Int` do Prisma (máx ~R$ 21,4M) com folga | y |
| Data da transação | Somente data (sem hora/timezone), formato `YYYY-MM-DD`; passado e futuro permitidos, entre 2000-01-01 e 100 anos à frente | Projeções (item 5) exigem lançamentos futuros ("entradas previstas"); date-only elimina bugs de fuso na virada de mês; limites barram typos (ano 0202) | y |
| Descrição | **Opcional**; quando informada, trim + máximo 140 caracteres; na listagem, transação sem descrição exibe "—" no lugar | Decisão do usuário (revisão de 2026-07-18): não obrigar descrição; 140 protege a listagem | y |
| Ordenação da listagem | Data decrescente; empate de data desempatado por criação mais recente primeiro | "O que aconteceu por último" é a expectativa natural; critério de desempate determinístico é exigência para paginação estável | y |
| Paginação da listagem | **Paginação numerada**: páginas de 20 itens com navegação numerada (página atual destacada, navegação para anterior/seguinte) | Decisão do usuário (revisão de 2026-07-18): paginação numerada em vez de "carregar mais" | y |
| Rotas | `/app/transactions` (listagem + cadastro) e `/app/categories` (categorias padrão + personalizadas + criação) | Paths em inglês (AD-014), sob `/app` que já é protegido pelo proxy da feature auth | y |
| Posição do formulário de transação | **Modal sobre a listagem** em `/app/transactions` | Decisão do usuário (revisão de 2026-07-18) | y |
| Exclusão de transações | Incluída nesta feature: excluir transação avulsa com confirmação simples | Pergunta do usuário na revisão de 2026-07-18; operação barata e autocontida (hard delete de 1 linha, sem cascata) | y |
| Edição de transações | Incluída nesta feature: editar todos os campos da transação no mesmo modal do cadastro, com as mesmas validações | Decisão do usuário (2ª revisão, 2026-07-18): corrigir lançamento errado é fluxo essencial do produto | y |
| Exclusão de categoria personalizada | Incluída nesta feature: bloqueada enquanto houver transações usando a categoria; quando sem uso, exige confirmação digitada exata "excluir permanentemente" + aviso explícito de irreversibilidade; hard delete; só personalizadas do próprio usuário (padrão são globais/imutáveis) | Decisão do usuário (2ª revisão, 2026-07-18), incluindo o mecanismo de confirmação | y |
| Idioma da UI | pt-BR | Padrão do produto, consistente com auth | y (AD-014) |

**Open questions:** none — todas as assumptions confirmadas pelo usuário.

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

### P1: Excluir categoria personalizada ⭐ MVP

**User Story**: Como usuário, quero excluir uma categoria personalizada que não uso, para manter minha lista de categorias limpa — sem risco de corromper transações existentes.

**Why P1**: Decisão do usuário na 2ª revisão da spec (2026-07-18), incluindo o mecanismo de proteção: bloqueio quando em uso + confirmação digitada + aviso de irreversibilidade.

**Acceptance Criteria**:

1. WHEN o usuário aciona a exclusão de uma categoria personalizada que possui 1 ou mais transações vinculadas THEN o sistema SHALL bloquear a exclusão, informando que a categoria está em uso e não pode ser excluída.
2. WHEN o usuário aciona a exclusão de uma categoria personalizada sem nenhuma transação vinculada THEN o sistema SHALL exibir uma confirmação que (a) deixa explícito que a exclusão é permanente e sem reversão e (b) exige digitar o texto exato "excluir permanentemente" para habilitar a confirmação.
3. WHEN o texto digitado difere de "excluir permanentemente" THEN o sistema SHALL manter a exclusão desabilitada.
4. WHEN o usuário digita o texto exato e confirma THEN o sistema SHALL excluir a categoria definitivamente e removê-la de todas as listagens e seletores.
5. WHEN a categoria é padrão (global) THEN o sistema SHALL NOT oferecer a opção de exclusão (padrão são imutáveis no MVP).
6. WHEN a exclusão é submetida server-side para uma categoria padrão, de outro usuário, inexistente OU que passou a ter transações vinculadas (corrida entre a checagem e a confirmação) THEN o sistema SHALL rejeitar na fronteira sem excluir nada — a integridade final é garantida por restrição no banco (FK RESTRICT), não só por verificação prévia.

**Independent Test**: Criar categoria "Pets", vincular uma transação → exclusão bloqueada; excluir a transação → exclusão pedida exige digitar "excluir permanentemente" e avisa que não há reversão; digitar errado → botão inerte; digitar certo → categoria some do banco e dos seletores.

---

### P1: Registrar transação avulsa (entrada ou saída) ⭐ MVP

**User Story**: Como usuário, quero registrar uma entrada ou saída com data, valor, descrição e categoria, para centralizar minhas movimentações financeiras no Prumo.

**Why P1**: É o núcleo do item 3 do roadmap e a fonte de dados de projeções e dashboard.

**Acceptance Criteria**:

1. WHEN o usuário aciona o cadastro de transação em `/app/transactions` THEN o sistema SHALL exibir o formulário em um modal sobre a listagem, com os campos: tipo (entrada/saída), data, valor, descrição (opcional) e categoria.
2. WHEN o usuário seleciona o tipo (entrada ou saída) THEN o sistema SHALL exibir no seletor de categoria somente categorias daquele tipo (padrão + personalizadas do próprio usuário).
3. WHEN o usuário submete o formulário com todos os campos válidos THEN o sistema SHALL persistir a transação vinculada ao seu usuário, com valor em centavos inteiros (AD-008), e exibi-la na listagem.
4. WHEN o valor submetido é zero, negativo, não numérico ou maior que R$ 10.000.000,00 THEN o sistema SHALL rejeitar a submissão indicando a regra do campo.
5. WHEN a data submetida é inválida, anterior a 2000-01-01 ou além de 100 anos no futuro THEN o sistema SHALL rejeitar a submissão indicando a regra do campo.
6. WHEN a data submetida é futura (dentro do limite) THEN o sistema SHALL aceitar a transação (lançamentos previstos são casos de uso legítimos para projeções — item 5).
7. WHEN a descrição informada, após trim, excede 140 caracteres THEN o sistema SHALL rejeitar a submissão indicando a regra do campo; WHEN a descrição está vazia ou ausente THEN o sistema SHALL aceitar a transação sem descrição.
8. WHEN a categoria submetida não existe, não é visível para o usuário (personalizada de outro usuário) ou tem tipo diferente do tipo da transação THEN o sistema SHALL rejeitar a submissão na fronteira server-side.
9. WHEN a validação client-side é contornada THEN o sistema SHALL rejeitar entradas inválidas na fronteira server-side com Zod (AD-003).

**Independent Test**: Registrar "Salário — R$ 5.000,00 — hoje — Salário (entrada)" e "Mercado — R$ 250,37 — hoje — Alimentação (saída)" → ambas aparecem na listagem; registrar uma sem descrição → aceita; repetir com cada violação de campo → erro correspondente e nada persistido.

---

### P1: Listar transações ⭐ MVP

**User Story**: Como usuário, quero ver minhas transações em ordem cronológica, para acompanhar o que entrou e saiu.

**Why P1**: Cadastro sem listagem não é verificável pelo usuário; o E2E do roadmap exige ver as transações criadas.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/app/transactions` THEN o sistema SHALL listar suas transações ordenadas por data decrescente (desempate: criação mais recente primeiro), exibindo data, descrição, categoria, tipo e valor formatado em BRL via `formatBRL` do `shared` (AD-008).
2. WHEN uma transação não tem descrição THEN a listagem SHALL exibir "—" no lugar da descrição.
3. WHEN a listagem exibe uma entrada e uma saída THEN o sistema SHALL distingui-las visualmente (entrada e saída não podem ser confundidas entre si).
4. WHEN o usuário não tem nenhuma transação THEN o sistema SHALL exibir um estado vazio com orientação para criar a primeira transação (nunca uma tela quebrada ou em branco).
5. WHEN o usuário tem mais de 20 transações THEN o sistema SHALL paginar a listagem em páginas de 20 itens, com navegação numerada indicando a página atual e permitindo ir a qualquer página (anterior/seguinte incluídos).
6. WHEN o usuário navega para uma página fora do intervalo existente (ex.: página 99 com 2 páginas de dados) THEN o sistema SHALL exibir a listagem em um estado válido (primeira página ou estado vazio da página), nunca um erro.
7. WHEN o usuário A acessa a listagem THEN o sistema SHALL NOT exibir nenhuma transação do usuário B (AD-012).

**Independent Test**: Com 25 transações criadas, abrir `/app/transactions` → 20 visíveis na ordem correta com navegação numerada mostrando 2 páginas; ir à página 2 → 5 restantes; conta nova → estado vazio.

---

### P1: Editar transação ⭐ MVP

**User Story**: Como usuário, quero editar uma transação lançada com dados errados (valor, data, descrição, categoria ou tipo), para corrigir meus registros sem precisar excluir e recriar.

**Why P1**: Decisão do usuário na 2ª revisão da spec (2026-07-18): corrigir lançamentos é fluxo essencial de um app de finanças pessoais.

**Acceptance Criteria**:

1. WHEN o usuário aciona a edição de uma transação na listagem THEN o sistema SHALL abrir o mesmo modal do cadastro pré-preenchido com os valores atuais da transação (tipo, data, valor, descrição, categoria).
2. WHEN o usuário submete alterações válidas THEN o sistema SHALL persistir as mudanças e a listagem SHALL refletir os novos valores (incluindo reposicionamento se a data mudou).
3. WHEN qualquer campo alterado viola as regras do cadastro (valor, data, descrição, categoria válida/visível/tipo-correto) THEN o sistema SHALL rejeitar a edição com o mesmo comportamento de validação do cadastro, client e server-side (AD-003) — nada é persistido parcialmente.
4. WHEN o usuário altera o tipo da transação (entrada ↔ saída) THEN o sistema SHALL exigir a seleção de uma categoria do novo tipo (seletor re-filtrado; server rejeita mismatch).
5. WHEN a edição é submetida para uma transação que não pertence ao usuário da sessão OU não existe THEN o sistema SHALL rejeitar na fronteira server-side sem alterar nada (AD-012).
6. WHEN o usuário cancela a edição THEN o sistema SHALL manter a transação intacta.

**Independent Test**: Criar transação, editar valor e data → listagem reflete e reordena; trocar tipo sem trocar categoria → rejeitado; editar id de outro usuário via request direto → rejeitado; cancelar → intacta.

---

### P1: Excluir transação ⭐ MVP

**User Story**: Como usuário, quero excluir uma transação lançada por engano, para manter meus registros corretos.

**Why P1**: Decisão do usuário na revisão da spec (2026-07-18): sem exclusão, um lançamento indevido polui as projeções para sempre. Operação autocontida (hard delete de 1 linha, sem cascata) — por isso a confirmação é simples, sem o texto digitado exigido na exclusão de categoria.

**Acceptance Criteria**:

1. WHEN o usuário aciona a exclusão de uma transação na listagem THEN o sistema SHALL pedir confirmação antes de excluir (a exclusão nunca ocorre em um clique único).
2. WHEN o usuário confirma a exclusão THEN o sistema SHALL remover a transação definitivamente e a listagem SHALL deixar de exibi-la.
3. WHEN o usuário cancela a confirmação THEN o sistema SHALL manter a transação intacta.
4. WHEN a exclusão é submetida para uma transação que não pertence ao usuário da sessão OU não existe THEN o sistema SHALL rejeitar na fronteira server-side sem excluir nada (AD-012).

**Independent Test**: Criar transação, excluir com confirmação → some da listagem e do banco; cancelar exclusão → permanece; tentar excluir id de outro usuário via request direto → rejeitado.

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
- WHEN campos de texto recebem espaços nas bordas THEN o sistema SHALL fazer trim antes de validar (nome de categoria, descrição); descrição que vira vazia após trim é tratada como ausente (permitido).
- WHEN duas exclusões da mesma transação são submetidas concorrentemente (duplo clique, duas abas) THEN o sistema SHALL excluir uma única vez e tratar a segunda como não-encontrada, sem erro visível ao usuário além do refresh da listagem.
- WHEN uma transação é criada referenciando uma categoria ao mesmo tempo em que essa categoria é excluída (corrida) THEN o sistema SHALL garantir que nunca exista transação apontando para categoria inexistente — FK RESTRICT no banco decide: ou a transação entra antes (e a exclusão é rejeitada), ou a categoria sai antes (e a criação é rejeitada).
- WHEN uma transação em edição tem sua categoria excluída por outra aba antes do submit THEN o sistema SHALL rejeitar a edição na fronteira (categoria inexistente), mantendo a transação com os valores anteriores.
- WHEN o usuário submete uma transação referenciando uma categoria personalizada que acabou de ser criada por ele THEN o sistema SHALL aceitá-la (categorias recém-criadas são imediatamente utilizáveis).
- WHEN um request malicioso envia `userId` de outro usuário no payload THEN o sistema SHALL ignorar qualquer `userId` do payload e usar exclusivamente o usuário da sessão autenticada (AD-012).
- WHEN um usuário não autenticado acessa `/app/transactions` ou `/app/categories` THEN o sistema SHALL redirecioná-lo para `/login` (proteção herdada do proxy de `/app` — feature auth).
- WHEN a transação tem valor nos limites (R$ 0,01 e R$ 10.000.000,00 exatos) THEN o sistema SHALL aceitá-la (limites são inclusivos).
- WHEN o nome de categoria contém caracteres não-ASCII válidos (acentos, emoji) THEN o sistema SHALL aceitá-lo dentro do limite de 40 caracteres.

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Coberto: valor (>0, ≤ R$10M, centavos), data (janela 2000→+100 anos, date-only), descrição (opcional, ≤140), nome de categoria (1–40, unicidade), tipo/categoria match, trim, Zod server-side |
| Failure / partial-failure states | Coberto: cada cadastro/edição/exclusão é escrita única e atômica (uma linha); falha de validação não persiste nada. Sem orquestração multi-passo nesta feature |
| Idempotency / retry / duplicates | Coberto: seed de categorias padrão idempotente (AC 2 da story 1); unicidade de nome de categoria por constraint; exclusão dupla concorrente tratada como não-encontrada (edge case). Transações duplicadas idênticas são permitidas (duas compras iguais no mesmo dia são legítimas) |
| Auth boundaries & rate limits | Boundaries cobertos: rotas sob `/app` protegidas (proxy da feature auth); actions exigem sessão; `userId` sempre da sessão, nunca do payload; edição/exclusão só do próprio dado. Rate limiting: N/A because operações autenticadas de baixo risco, sem superfície de enumeração |
| Concurrency / ordering | Coberto: criação concorrente de categoria com mesmo nome (constraint); exclusão dupla concorrente; corrida exclusão-de-categoria × criação/edição-de-transação (FK RESTRICT); ordenação determinística da listagem com critério de desempate |
| Data lifecycle / expiry | Coberto: exclusão de transação (hard delete, confirmação simples) e de categoria personalizada sem uso (hard delete, confirmação digitada "excluir permanentemente" + aviso de irreversibilidade; bloqueada quando em uso). Edição/arquivamento de categorias fora do escopo; demais dados vivem indefinidamente no MVP |
| Observability | N/A because MVP usa logs padrão do framework; sem requisito adicional desta feature |
| External-dependency failure | N/A because a feature não consome nenhuma API externa (só banco próprio) |
| State-transition integrity | Coberto (exclusão de categoria): em uso → bloqueada; sem uso → excluível com confirmação digitada; integridade final por FK RESTRICT no banco, não só checagem prévia. Transações não têm máquina de estados nesta feature (status de parcela chega no item 4) |

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
| CAT-07 | P1: Excluir categoria personalizada (bloqueio em uso + confirmação digitada "excluir permanentemente" + aviso de irreversibilidade + FK RESTRICT + padrão não-excluível) | Design | Pending |
| TXN-01 | P1: Registrar transação (formulário em modal: tipo/data/valor/descrição opcional/categoria) | Design | Pending |
| TXN-02 | P1: Registrar transação (seletor de categoria filtrado por tipo) | Design | Pending |
| TXN-03 | P1: Registrar transação (persistência em centavos + vínculo ao usuário da sessão) | Design | Pending |
| TXN-04 | P1: Registrar transação (validações: valor, data, descrição ≤140 quando presente, categoria válida/visível/tipo-correto) | Design | Pending |
| TXN-05 | P1: Registrar transação (validação Zod server-side na fronteira) | Design | Pending |
| TXN-06 | P1: Listar transações (ordenação data desc + desempate, BRL via shared, distinção visual entrada/saída, "—" sem descrição) | Design | Pending |
| TXN-07 | P1: Listar transações (estado vazio + paginação numerada de 20 + página fora do intervalo) | Design | Pending |
| TXN-08 | P1: Listar transações (isolamento por usuário — AD-012) | Design | Pending |
| TXN-09 | P1: Excluir transação (confirmação + hard delete + só o próprio dado — AD-012) | Design | Pending |
| TXN-10 | P1: Editar transação (modal pré-preenchido + mesmas validações do cadastro + re-filtro de categoria ao trocar tipo + só o próprio dado — AD-012) | Design | Pending |
| TXN-11 | P2: E2E (login → criar entrada → criar saída → ambas na listagem) | Design | Pending |

**ID format:** `CAT-NN` (módulo categories), `TXN-NN` (módulo transactions)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 18 total, 0 mapped to tasks, 18 unmapped ⚠️ (esperado — Tasks ainda não gerado)

---

## Success Criteria

- [ ] Uma conta recém-criada consegue, usando apenas a UI: ver categorias padrão, criar uma categoria personalizada, registrar uma entrada e uma saída, vê-las listadas em BRL, editar uma, excluir a outra e excluir a categoria personalizada sem uso — em produção.
- [ ] Zero categorias excluídas enquanto referenciadas por transações; zero exclusões de categoria concluídas sem o texto de confirmação exato (verificado por testes de integração e de componente).
- [ ] Zero transações persistidas com valor ≤ 0, valor em float, descrição > 140 caracteres, data fora da janela ou categoria inválida/de outro usuário (verificado por testes de integração da fronteira).
- [ ] Zero categorias ou transações de um usuário visíveis para outro (verificado por testes de integração com dois usuários — AD-012).
- [ ] Soma dos testes da feature verde no CI: unitários (domain), integração (data + actions) e o novo E2E de transações.
- [ ] Nenhuma violação de fronteira de módulos: `transactions` consome `categories` apenas via `index.ts` (AD-010) — lint verde.
