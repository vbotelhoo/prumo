# Compras Parceladas e Financiamentos Specification

**Feature**: `commitments` — Roadmap item 4
**Módulos tocados**: `commitments` (novo domínio completo), `categories` (consumido via `index.ts` para o seletor de categoria e protegido por FK RESTRICT — sem mudança de API pública prevista), `prisma/` (novos models `Commitment` + `Installment` e migration), `shared` (consome `Money`/`formatBRL`/`parseBRL`; sem mudança de API prevista), `src/app` (nova rota `/app/commitments` + navegação)
**Módulos NÃO tocados**: `transactions` (parcelas não entram na listagem de avulsas — decisão do usuário 2026-07-19), `projections` (consumirá este módulo no item 5, fora deste escopo)
**APIs públicas alteradas**: `commitments/index.ts` deixa de ser placeholder e passa a exportar tipos, schemas Zod, actions e componentes (detalhado no Design)

## Problem Statement

O Prumo já registra transações avulsas, mas a maior fonte de comprometimento financeiro do usuário são compras parceladas (ex.: notebook em 12x) e dívidas/financiamentos de longo prazo (ex.: carro em 48x). Sem materializar essas parcelas com vencimento e status próprios, o usuário não enxerga o que já se comprometeu a pagar nos próximos meses — e as projeções mensais (item 5) e o dashboard (item 6) não têm como somar o comprometido futuro. Este item é a base do "olhar pra frente" do produto.

## Goals

- [ ] Usuário consegue registrar uma **compra parcelada** informando valor total e número de parcelas; o sistema materializa N parcelas mensais automaticamente (AD-009).
- [ ] Usuário consegue registrar um **financiamento/dívida** informando o valor da parcela fixa e o número de parcelas; o sistema materializa N parcelas mensais.
- [ ] O arredondamento é determinístico: a diferença de centavos vai para a **primeira parcela prevista**; a soma de todas as parcelas é sempre exatamente igual ao valor total (invariante com teste unitário — AD-009, AD-008).
- [ ] Usuário consegue **marcar/desmarcar** qualquer parcela como paga (reversível, ordem livre) e acompanhar a quitação (parcelas pagas/total, valor pago e saldo devedor).
- [ ] Usuário consegue **editar** um compromisso (valor, categoria, descrição, número de parcelas, vencimentos), escolhendo se a mudança afeta só as parcelas previstas futuras ou todas as previstas; parcelas já pagas nunca são alteradas.
- [ ] Usuário consegue **excluir** um compromisso; parcelas já pagas são preservadas como histórico.
- [ ] Nenhum compromisso, parcela ou categoria vaza entre usuários (AD-012), coberto por testes de integração.
- [ ] E2E cobre: criar parcelamento, verificar as parcelas futuras e o arredondamento, e marcar uma parcela como paga (roadmap item 4, AD-011).

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Reason |
| ------- | ------ |
| Juros, amortização (SAC/Price), taxas e correção monetária | O financiamento é modelado como parcela fixa × N já contratada; o cálculo de juros do banco é entrada do usuário, não do Prumo. Fase futura, se necessário |
| Parcelas de valor variável (parcela balão, entrada + N) | MVP materializa parcelas iguais (com só a diferença de centavos na 1ª); parcelas irregulares são complexidade fora do MVP |
| Compromissos de **entrada** (a receber parcelado) | Compromisso é sempre saída/despesa no MVP; recebíveis parcelados são caso raro para finanças pessoais |
| Data de pagamento por parcela | Marcar paga é um toggle sem registrar quando foi paga (decisão do usuário 2026-07-19); data de pagamento é dado extra fora do MVP |
| Parcelas na listagem de `/app/transactions` | Decisão do usuário: parcelas vivem só em `/app/commitments` para não misturar avulsas com parceladas; a agregação unificada é papel de `projections` (item 5) |
| Recorrências sem fim (assinaturas mensais infinitas) | Este módulo trata compromissos com N finito de parcelas; recorrência infinita é outro conceito, fora do MVP |
| Antecipação/renegociação com recálculo de juros | Editar valor redistribui linearmente entre previstas; renegociação com juros é fase futura |
| E2E de isolamento com 2 contas | O roadmap aloca esse E2E no item 5 (`projections`); aqui o isolamento é coberto por testes de integração (AD-012) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear. Decisões coletadas com o usuário em 2026-07-19 (ver `context.md`).

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Modelagem parcelada × financiamento | **Tipo único, dois modos de entrada.** Modo `parcelada`: usuário informa TOTAL + N (sistema divide). Modo `financiamento`: usuário informa PARCELA FIXA + N (total = parcela × N). Ambos materializam N parcelas iguais com status próprio | Um só domínio, uma tela, uma invariante; a diferença é só de qual valor deriva qual | y |
| Regra de vencimento | 1ª parcela vence na **data informada**; parcelas seguintes no **mesmo dia** dos meses subsequentes. Dia inexistente no mês (ex.: 31 em fevereiro) **ajusta para o último dia do mês** | Previsível e alinhado à intuição de "todo dia X"; clamp ao último dia evita data inválida | y |
| Edição/exclusão × parcelas pagas | Parcelas **pagas são histórico imutável**: edição e exclusão afetam apenas parcelas **previstas**; o usuário escolhe "só as previstas futuras" ou "todas as previstas"; pagas nunca mudam nem são removidas | Preserva o histórico real de pagamento; a redistribuição opera só sobre o que ainda não foi pago | y |
| Navegação | Compromissos e parcelas vivem em **`/app/commitments`** (lista com progresso + parcelas); `/app/transactions` continua só com avulsas | Não misturar avulsas com parceladas; a visão unificada é papel de `projections` (item 5). Path em inglês (AD-014) | y |
| Marcar como paga | **Toggle reversível, sem data, ordem livre**: clicar marca paga; clicar de novo volta a prevista; qualquer parcela pode ser paga em qualquer ordem | Fluxo mais simples; erro de clique é reversível; data de pagamento fica fora do MVP | y |
| Categoria e tipo | Compromisso é **sempre saída**; UMA categoria de saída (padrão ou personalizada do usuário) escolhida na criação, **armazenada só no compromisso** e aplicada a todas as parcelas. Trocar a categoria afeta o compromisso inteiro (não há "só futuras" para categoria) | Consistente com item 3 (parcelas classificadas por categoria); despesa é o único caso do MVP; categoria no pai mantém o modelo simples (Opção B) | y |
| Escopo de edição | **Tudo editável**: valor, categoria, descrição, número de parcelas e vencimentos — sempre respeitando "pagas são imutáveis" (mexe só nas previstas) | Corrigir um compromisso lançado errado (inclusive nº de parcelas) é fluxo essencial | y |
| Acompanhamento de quitação | Cada compromisso exibe **progresso pagas/total**, **valor já pago** e **saldo devedor** (soma das parcelas previstas restantes), além de barra de progresso | "Acompanhamento de quitação" pedido no roadmap; agregados dão o panorama num relance | y |
| Número de parcelas (N) | Inteiro, **mínimo 2, máximo 360** | N=1 é uma transação avulsa (feature 3); 360 (30 anos) cobre financiamentos longos sem estourar limites | y (default do agente) |
| Valor total do compromisso | Inteiro em centavos (AD-008), **> 0**, **≤ R$ 10.000.000,00** (10^9 centavos). No modo financiamento, total = parcela × N também respeita esse teto; cada parcela materializada é `Int` do Prisma (folga até ~R$ 21,4M) | Mesmo teto das transações (feature 3); protege o `Int` do Prisma; valor da parcela fixa também > 0 | y (default do agente) |
| Valor mínimo da parcela | Cada parcela materializada deve ser **≥ R$ 0,01** (1 centavo). Rejeita N tão grande que alguma parcela ficaria com 0 centavos (ex.: R$ 0,10 em 20x) | Parcela de valor zero não faz sentido e quebraria a distinção prevista/paga | y (default do agente) |
| Data da 1ª parcela (vencimento inicial) | Formato `YYYY-MM-DD`, date-only; janela **2000-01-01 até +100 anos** (mesma das transações); passado e futuro permitidos | Financiamento antigo em andamento pode ter começado no passado; projeções (item 5) precisam de vencimentos futuros; date-only evita bug de fuso | y (default do agente) |
| Descrição do compromisso | **Obrigatória**, trim, 1–140 caracteres (ex.: "Notebook Dell", "Financiamento do carro") | Diferente da transação avulsa: um compromisso sem rótulo é difícil de reconhecer numa lista de dívidas; 140 protege a UI | y (default do agente) |
| Redistribuição ao editar valor | Ao mudar o total (ou a parcela fixa), o sistema recalcula o valor das parcelas **previstas** de forma que soma(pagas) + soma(previstas) = novo total; a diferença de centavos vai para a **primeira parcela prevista**. Se novo total < soma já paga, a edição é rejeitada | Mantém a invariante de soma mesmo com parcelas já pagas; não permite "dever negativo" | y (default do agente) |
| Exclusão de categoria em uso por compromisso | Categoria referenciada por um compromisso **não pode ser excluída** (FK RESTRICT no banco) — estende CAT-07 da feature 3 para incluir parcelas/compromissos | Integridade referencial: nenhum compromisso pode apontar para categoria inexistente | y (default do agente) |
| Atomicidade da materialização | Criar/editar um compromisso gera/regenera as parcelas em **uma única transação de banco**; falha não deixa compromisso sem parcelas nem parcelas órfãs | Invariante pai+filhos nunca fica meio-materializada | y (default do agente) |
| Idioma da UI | pt-BR | Padrão do produto (AD-014) | y |

**Open questions:** none — todas as assumptions confirmadas pelo usuário ou registradas como default do agente com rationale.

---

## User Stories

### P1: Criar compra parcelada ⭐ MVP

**User Story**: Como usuário, quero registrar uma compra parcelada informando o valor total e o número de parcelas, para que o Prumo materialize automaticamente as parcelas mensais que vou pagar.

**Why P1**: É o núcleo do item 4 do roadmap e a fonte do "comprometido futuro" para projeções e dashboard.

**Acceptance Criteria**:

1. WHEN o usuário aciona a criação de compromisso em `/app/commitments` e escolhe o modo **parcelada** THEN o sistema SHALL exibir um formulário com: descrição, categoria (de saída), **valor total**, número de parcelas e data da 1ª parcela.
2. WHEN o usuário submete valor total válido (> 0, ≤ R$ 10.000.000,00), N válido (2–360) e data válida THEN o sistema SHALL criar o compromisso e materializar N parcelas mensais, cada uma com valor `piso(total/N)`, distribuindo a diferença de centavos na **primeira parcela**, de modo que a soma das N parcelas seja **exatamente** igual ao total.
3. WHEN as N parcelas são materializadas THEN cada parcela SHALL ter vencimento mensal a partir da data informada (mesmo dia; dia inexistente no mês ajustado para o último dia do mês) e status inicial **prevista**.
4. WHEN o número de parcelas faria alguma parcela ter valor < R$ 0,01 (ex.: R$ 0,10 em 20x) THEN o sistema SHALL rejeitar a submissão indicando a regra.
5. WHEN o valor total, N ou a data violam suas regras (valor ≤ 0 ou > teto, N fora de 2–360, data fora da janela ou mal formada, descrição vazia ou > 140 chars, categoria inexistente/de outro usuário/não-saída) THEN o sistema SHALL rejeitar a submissão na fronteira server-side com Zod (AD-003), sem materializar nada.
6. WHEN o compromisso é criado THEN o sistema SHALL vinculá-lo ao usuário da sessão (AD-012), ignorando qualquer `userId` vindo do payload.

**Independent Test**: Criar "Notebook — R$ 3.000,00 — 12x — 10/08/2026 — Eletrônicos". Verificar 12 parcelas: a 1ª de R$ 250,00 (ou com a sobra de centavos), soma exatamente R$ 3.000,00, vencimentos 10/08, 10/09, ..., todas previstas.

---

### P1: Criar financiamento/dívida (parcela fixa) ⭐ MVP

**User Story**: Como usuário, quero registrar um financiamento informando o valor da parcela fixa e o número de parcelas, para acompanhar uma dívida de longo prazo e sua quitação.

**Why P1**: Requisito explícito do roadmap ("dívidas/financiamentos de longo prazo com parcela fixa e acompanhamento de quitação").

**Acceptance Criteria**:

1. WHEN o usuário aciona a criação de compromisso e escolhe o modo **financiamento** THEN o sistema SHALL exibir um formulário com: descrição, categoria (de saída), **valor da parcela fixa**, número de parcelas e data da 1ª parcela.
2. WHEN o usuário submete parcela fixa válida (> 0), N válido (2–360) e data válida THEN o sistema SHALL calcular o total como `parcela × N`, criar o compromisso e materializar N parcelas mensais **todas com o valor da parcela fixa** (sem sobra de centavos, pois total é múltiplo exato), status inicial **prevista**.
3. WHEN `parcela × N` excede R$ 10.000.000,00 THEN o sistema SHALL rejeitar a submissão indicando a regra do teto.
4. WHEN parcela fixa, N ou data violam suas regras THEN o sistema SHALL rejeitar na fronteira server-side com Zod (AD-003), sem materializar nada.
5. WHEN o financiamento é criado THEN o sistema SHALL registrar o modo/entrada de origem de forma que a edição futura preserve a semântica (ver Assumptions — redistribuição).

**Independent Test**: Criar "Carro — parcela R$ 1.200,00 — 48x — 05/09/2026 — Financiamento". Verificar total R$ 57.600,00, 48 parcelas de R$ 1.200,00 exatas, vencimentos mensais a partir de 05/09, todas previstas.

---

### P1: Listar compromissos com acompanhamento de quitação ⭐ MVP

**User Story**: Como usuário, quero ver meus compromissos e o progresso de quitação de cada um, para saber quanto já paguei e quanto ainda devo.

**Why P1**: Cadastro sem visualização não é verificável; "acompanhamento de quitação" é requisito do roadmap.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/app/commitments` THEN o sistema SHALL listar seus compromissos exibindo, para cada um: descrição, categoria, valor total, **nº de parcelas pagas / total**, **valor já pago**, **saldo devedor** (soma das parcelas previstas restantes) e uma indicação visual de progresso.
2. WHEN o usuário abre/expande um compromisso THEN o sistema SHALL exibir suas parcelas com número da parcela (ex.: 3/12), vencimento, valor formatado em BRL (via `formatBRL` do `shared`) e status (prevista/paga).
3. WHEN o usuário não tem nenhum compromisso THEN o sistema SHALL exibir um estado vazio com orientação para criar o primeiro (nunca uma tela quebrada ou em branco).
4. WHEN todas as parcelas de um compromisso estão pagas THEN o sistema SHALL indicá-lo como **quitado** (saldo devedor R$ 0,00, progresso 100%).
5. WHEN o usuário A acessa a listagem THEN o sistema SHALL NOT exibir nenhum compromisso ou parcela do usuário B (AD-012).

**Independent Test**: Com um compromisso de 12x e 5 parcelas marcadas pagas → lista mostra "5/12 pagas", valor pago = soma das 5, saldo = soma das 7 restantes, progresso ~42%. Conta nova → estado vazio.

---

### P1: Marcar/desmarcar parcela como paga ⭐ MVP

**User Story**: Como usuário, quero marcar uma parcela como paga (e desmarcar se errei), para manter o acompanhamento de quitação correto.

**Why P1**: Requisito explícito do roadmap ("marcar parcela como paga"); é o que torna o acompanhamento de quitação real.

**Acceptance Criteria**:

1. WHEN o usuário aciona o toggle de uma parcela prevista THEN o sistema SHALL marcá-la como **paga** e atualizar o acompanhamento (pagas/total, valor pago, saldo devedor).
2. WHEN o usuário aciona o toggle de uma parcela já paga THEN o sistema SHALL voltá-la a **prevista** e atualizar o acompanhamento.
3. WHEN o usuário marca parcelas fora de ordem (ex.: pagar a 3ª antes da 1ª) THEN o sistema SHALL permitir, sem exigir sequência.
4. WHEN o toggle é submetido para uma parcela que não pertence a um compromisso do usuário da sessão OU não existe THEN o sistema SHALL rejeitar na fronteira server-side sem alterar nada (AD-012).
5. WHEN o mesmo toggle é submetido duas vezes concorrentemente (duplo clique) THEN o estado final SHALL ser determinístico e consistente (a parcela termina num único estado válido, sem erro visível além do refresh).

**Independent Test**: Marcar a parcela 1 → paga, saldo cai; marcar de novo → volta a prevista, saldo sobe; marcar parcela 3 sem tocar a 2 → aceito; tentar via request direto uma parcela de outro usuário → rejeitado.

---

### P1: Editar compromisso ⭐ MVP

**User Story**: Como usuário, quero editar um compromisso lançado com dados errados (valor, categoria, descrição, número de parcelas ou vencimentos), para corrigir sem excluir e recriar — preservando as parcelas que já paguei.

**Why P1**: Decisão do usuário (2026-07-19): edição completa é fluxo essencial; o roadmap pede "edição perguntando se afeta só parcelas futuras ou todas".

**Acceptance Criteria**:

1. WHEN o usuário aciona a edição de um compromisso THEN o sistema SHALL abrir o formulário pré-preenchido com os valores atuais (modo, descrição, categoria, valor, número de parcelas, data/vencimentos).
2. WHEN a edição altera o **valor** e existe mais de uma parcela prevista THEN o sistema SHALL perguntar se a mudança afeta **só as parcelas previstas futuras** (vencimento a partir de hoje) ou **todas as parcelas previstas**; parcelas **pagas nunca são alteradas**. WHEN a edição altera a **categoria** THEN o sistema SHALL aplicá-la ao compromisso inteiro (todas as parcelas), sem perguntar escopo — a categoria vive só no compromisso (decisão do usuário 2026-07-19).
3. WHEN o usuário edita o valor total (ou a parcela fixa) THEN o sistema SHALL redistribuir de modo que soma(pagas) + soma(previstas afetadas) resulte no novo total, colocando a diferença de centavos na **primeira parcela prevista afetada**, mantendo a invariante de soma.
4. WHEN o novo valor total é menor que a soma das parcelas já pagas THEN o sistema SHALL rejeitar a edição (não é possível dever valor negativo), indicando a regra.
5. WHEN o usuário altera o número de parcelas THEN o sistema SHALL adicionar parcelas previstas ao final (novos vencimentos mensais) ou remover parcelas **previstas** do final, nunca removendo parcelas pagas; se o novo N for menor que o nº de parcelas já pagas, o sistema SHALL rejeitar.
6. WHEN o usuário altera a data/vencimento THEN o sistema SHALL reprogramar os vencimentos das parcelas **previstas** mantendo a cadência mensal; parcelas pagas mantêm seu vencimento original.
7. WHEN qualquer campo alterado viola as regras de criação (valor, N, data, descrição, categoria válida/visível/de-saída) THEN o sistema SHALL rejeitar a edição na fronteira server-side (AD-003), sem persistir nada parcialmente.
8. WHEN a edição é submetida para um compromisso que não pertence ao usuário da sessão OU não existe THEN o sistema SHALL rejeitar na fronteira sem alterar nada (AD-012).
9. WHEN o usuário cancela a edição THEN o sistema SHALL manter o compromisso e suas parcelas intactos.

**Independent Test**: Compromisso 12x, 3 pagas; editar total → só as 9 previstas são recalculadas (soma total mantém), 3 pagas intactas; reduzir N para 2 (< 3 pagas) → rejeitado; reduzir N para 6 → remove 3 previstas do fim, mantém 3 pagas + 3 previstas; editar compromisso de outro usuário via request direto → rejeitado.

---

### P1: Excluir compromisso ⭐ MVP

**User Story**: Como usuário, quero excluir um compromisso lançado por engano, para limpar meus registros — sem apagar o histórico de parcelas que já paguei.

**Why P1**: Contraparte natural da criação; o roadmap pede "exclusão perguntando se afeta só parcelas futuras ou todas".

**Acceptance Criteria**:

1. WHEN o usuário aciona a exclusão de um compromisso THEN o sistema SHALL pedir confirmação antes de excluir (nunca em um clique único).
2. WHEN o compromisso possui parcelas **pagas** THEN a confirmação SHALL deixar explícito que só as parcelas **previstas** serão removidas e que as pagas serão preservadas como histórico; WHEN não há parcelas pagas THEN o sistema SHALL remover o compromisso e todas as suas parcelas.
3. WHEN o usuário confirma THEN o sistema SHALL remover as parcelas previstas (e o compromisso, se não restar nenhuma parcela paga) definitivamente, atualizando a listagem.
4. WHEN o usuário cancela a confirmação THEN o sistema SHALL manter o compromisso e as parcelas intactos.
5. WHEN a exclusão é submetida para um compromisso que não pertence ao usuário da sessão OU não existe THEN o sistema SHALL rejeitar na fronteira sem excluir nada (AD-012).

**Independent Test**: Compromisso 12x sem pagas → excluir remove compromisso e 12 parcelas; compromisso 12x com 3 pagas → excluir remove as 9 previstas e preserva as 3 pagas como histórico; excluir compromisso de outro usuário via request direto → rejeitado.

---

### P2: E2E do fluxo de parcelamento

**User Story**: Como mantenedor, quero um teste E2E cobrindo criar um parcelamento, verificar as parcelas futuras e o arredondamento, e marcar uma parcela como paga, para garantir o fluxo crítico no CI antes de qualquer deploy.

**Why P2**: Exigência do roadmap item 4 e de AD-011; é P2 apenas porque depende das P1 estarem prontas — mas é obrigatório para a feature ser considerada concluída.

**Acceptance Criteria**:

1. WHEN a suíte E2E roda no CI THEN o sistema SHALL passar no fluxo: login → criar parcelamento (valor total + N que gere sobra de centavos, ex.: R$ 100,00 em 3x) → ver as N parcelas com vencimentos mensais e valores corretos (1ª com a sobra: 33,34 / 33,33 / 33,33, soma 100,00) → marcar a 1ª parcela como paga → acompanhamento reflete 1/3 pagas.
2. WHEN o fluxo E2E cria dados THEN o teste SHALL usar conta e dados próprios, sem depender de estado deixado por outros testes (AD-011).

**Independent Test**: `pnpm test:e2e` verde no CI com o novo spec de compromissos, incluindo a asserção do arredondamento e do toggle de pagamento.

---

## Edge Cases

- WHEN o total não é divisível igualmente pelo N (ex.: R$ 100,00 em 3x) THEN o sistema SHALL colocar a sobra de centavos na 1ª parcela (33,34) e as demais no piso (33,33), com soma exata igual ao total (invariante com teste unitário — AD-009).
- WHEN a 1ª parcela vence num dia que não existe nos meses seguintes (ex.: 31/01) THEN o sistema SHALL ajustar cada vencimento para o último dia do mês correspondente (28/02 ou 29/02, 31/03, 30/04, ...).
- WHEN o valor da parcela é digitado com máscara BRL (`1.234,56`) THEN o sistema SHALL converter para centavos inteiros via `parseBRL` antes de validar e persistir — nunca float em nenhuma camada (AD-008).
- WHEN o usuário edita o valor total de um compromisso com parcelas já pagas THEN o sistema SHALL redistribuir apenas entre as previstas, mantendo soma(pagas)+soma(previstas)=novo total; se novo total < soma paga, rejeita.
- WHEN o usuário reduz o número de parcelas para menos que o número de parcelas já pagas THEN o sistema SHALL rejeitar a edição.
- WHEN duas marcações de pagamento da mesma parcela são submetidas concorrentemente (duplo clique, duas abas) THEN o estado final SHALL ser um único estado válido (idempotência do toggle sobre estado desejado), sem erro visível além do refresh.
- WHEN a categoria escolhida para o compromisso é excluída em outra aba antes do submit THEN o sistema SHALL rejeitar a criação/edição na fronteira (categoria inexistente/não visível), sem materializar parcelas.
- WHEN o usuário tenta excluir uma categoria que está sendo usada por um compromisso THEN o sistema SHALL bloquear a exclusão (FK RESTRICT no banco) — estende a proteção de CAT-07 (feature 3) às parcelas/compromissos.
- WHEN um request malicioso envia `userId` de outro usuário no payload THEN o sistema SHALL ignorar qualquer `userId` do payload e usar exclusivamente o usuário da sessão (AD-012).
- WHEN um usuário não autenticado acessa `/app/commitments` THEN o sistema SHALL redirecioná-lo para `/login` (proteção herdada do proxy de `/app` — feature auth).
- WHEN o valor total é exatamente R$ 0,01 e N = 2 THEN o sistema SHALL rejeitar (2ª parcela ficaria com 0 centavos — regra de parcela ≥ R$ 0,01).
- WHEN o valor total ou `parcela × N` está exatamente no teto (R$ 10.000.000,00) THEN o sistema SHALL aceitá-lo (limite inclusivo).
- WHEN a data da 1ª parcela é no passado (financiamento já em andamento) THEN o sistema SHALL aceitar, materializando parcelas com vencimentos passados como previstas (o usuário marca as já pagas).

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Coberto: valor (>0, ≤ R$10M, centavos), N (2–360), parcela ≥ R$0,01, data (janela 2000→+100 anos, date-only, clamp fim-de-mês), descrição (1–140, trim), categoria de-saída/visível, modo parcelada/financiamento, Zod server-side |
| Failure / partial-failure states | Coberto: materialização (pai + N parcelas) é uma **transação atômica** de banco; falha não deixa compromisso sem parcelas nem parcelas órfãs; edição que regenera parcelas também é atômica |
| Idempotency / retry / duplicates | Coberto: toggle de pagamento converge para estado válido sob duplo clique (edge case); compromissos duplicados idênticos são permitidos (duas compras iguais são legítimas). Sem chave de dedup natural |
| Auth boundaries & rate limits | Boundaries cobertos: rota sob `/app` protegida (proxy auth); actions exigem sessão; `userId` sempre da sessão; edição/exclusão/toggle só sobre o próprio dado. Rate limiting: N/A because operações autenticadas de baixo risco, sem superfície de enumeração |
| Concurrency / ordering | Coberto: toggle concorrente (estado final determinístico); corrida exclusão-de-categoria × criação/edição-de-compromisso (FK RESTRICT); ordenação da listagem determinística; parcelas ordenadas por número de parcela |
| Data lifecycle / expiry | Coberto: exclusão de compromisso (remove previstas, preserva pagas como histórico); parcelas pagas são imutáveis. Sem TTL/arquivamento no MVP |
| Observability | N/A because MVP usa logs padrão do framework; sem requisito adicional desta feature |
| External-dependency failure | N/A because a feature não consome nenhuma API externa (só banco próprio) |
| State-transition integrity | Coberto: parcela transita prevista ↔ paga (toggle reversível, ordem livre); edição/exclusão só toca previstas; invariante soma(parcelas)=total preservada em toda mutação; FK RESTRICT garante integridade compromisso→categoria |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CMT-01 | P1: Criar parcelada (form modo parcelada: descrição/categoria/total/N/data) | Design | Pending |
| CMT-02 | P1: Criar parcelada (materialização N parcelas, arredondamento na 1ª, soma=total — AD-009) | Design | Pending |
| CMT-03 | P1: Criar parcelada (vencimentos mensais, clamp fim-de-mês, status inicial prevista) | Design | Pending |
| CMT-04 | P1: Criar parcelada/financiamento (validações valor/N/data/descrição/categoria + parcela ≥ R$0,01 + Zod server-side — AD-003) | Design | Pending |
| CMT-05 | P1: Criar parcelada/financiamento (vínculo ao usuário da sessão, userId nunca do payload — AD-012) | Design | Pending |
| CMT-06 | P1: Criar financiamento (form modo financiamento: parcela fixa + N; total = parcela × N) | Design | Pending |
| CMT-07 | P1: Criar financiamento (materialização N parcelas iguais; teto do total; preserva modo p/ edição) | Design | Pending |
| CMT-08 | P1: Listar compromissos (acompanhamento: pagas/total, pago, saldo devedor, progresso; parcelas expandíveis em BRL) | Design | Pending |
| CMT-09 | P1: Listar compromissos (estado vazio + estado quitado 100%) | Design | Pending |
| CMT-10 | P1: Listar compromissos (isolamento por usuário — AD-012) | Design | Pending |
| CMT-11 | P1: Marcar/desmarcar parcela paga (toggle reversível, ordem livre, atualiza acompanhamento) | Design | Pending |
| CMT-12 | P1: Marcar parcela paga (só o próprio dado — AD-012; toggle concorrente determinístico) | Design | Pending |
| CMT-13 | P1: Editar compromisso (form pré-preenchido; escolha "só futuras / todas as previstas"; pagas imutáveis) | Design | Pending |
| CMT-14 | P1: Editar compromisso (redistribuição de valor com soma=novo total; rejeita novo total < soma paga) | Design | Pending |
| CMT-15 | P1: Editar compromisso (alterar N: adiciona/remove só previstas; rejeita N < pagas; reprograma vencimentos das previstas) | Design | Pending |
| CMT-16 | P1: Editar compromisso (validações de criação + fronteira server-side; só o próprio dado — AD-012) | Design | Pending |
| CMT-17 | P1: Excluir compromisso (confirmação; remove previstas, preserva pagas como histórico; só o próprio dado — AD-012) | Design | Pending |
| CMT-18 | P2: E2E (login → criar parcelamento → verificar parcelas/arredondamento → marcar parcela paga) | Design | Pending |

**ID format:** `CMT-NN` (módulo commitments)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 18 total, 0 mapped to tasks (tasks.md ainda não gerado) ⚠️

---

## Success Criteria

- [ ] Uma conta consegue, usando apenas a UI: criar uma compra parcelada e um financiamento, ver as parcelas materializadas com vencimentos e arredondamento corretos, marcar/desmarcar parcelas como pagas, acompanhar a quitação (pagas/total, pago, saldo), editar (valor/categoria/N/data) preservando as pagas, e excluir preservando o histórico pago — em produção.
- [ ] Invariante financeira verde por teste unitário: para qualquer (total, N) válido, a soma das N parcelas materializadas é **exatamente** igual ao total, com a diferença de centavos na 1ª parcela (AD-009, AD-008).
- [ ] Zero parcelas materializadas com valor < R$ 0,01, valor em float, ou vencimento inválido; zero compromissos persistidos com valor ≤ 0, N fora de 2–360 ou categoria inválida/de-outro-usuário/não-saída (verificado por testes de integração da fronteira).
- [ ] Zero parcelas **pagas** alteradas ou removidas por edição/exclusão (verificado por testes de integração).
- [ ] Zero compromissos ou parcelas de um usuário visíveis/mutáveis por outro (verificado por testes de integração com dois usuários — AD-012).
- [ ] Soma dos testes da feature verde no CI: unitários (domain: arredondamento, cronograma de vencimentos, redistribuição), integração (data + actions) e o novo E2E de parcelamento.
- [ ] Nenhuma violação de fronteira de módulos: `commitments` consome `categories`/`shared`/`auth` apenas via `index.ts` (AD-010) — lint verde.
