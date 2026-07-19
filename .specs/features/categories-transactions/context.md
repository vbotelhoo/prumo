# Categorias + Transações Avulsas — Context

**Gathered:** 2026-07-18
**Spec:** `.specs/features/categories-transactions/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Roadmap item 3: categorias padrão + personalizadas por usuário; cadastro de entradas e saídas avulsas (data, valor, descrição, categoria); listagem de transações; exclusão de transação (adicionada na revisão); E2E criar entrada + criar saída + ver na listagem. Módulos `categories` e `transactions`.

---

## Implementation Decisions

Decisões tomadas pelo usuário na revisão da spec (respostas à numeração 1–14 apresentada em chat):

### Modelo de categorias

- **(1A)** Categorias padrão são registros globais (sem `userId`), criados por seed idempotente, compartilhados por todos os usuários e imutáveis no MVP — não copiadas por usuário.
- **(2A)** Toda categoria tem tipo `entrada` OU `saida`; o seletor da transação filtra por tipo e o servidor rejeita mismatch.
- **(3)** Conjunto padrão aprovado — Saída: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Assinaturas e serviços, Outros. Entrada: Salário, Renda extra, Investimentos, Outros. (Resposta do usuário: "permitir a criação de categorias" — interpretada como aprovação do conjunto padrão mantendo a criação de personalizadas, que já é story P1.)
- **(4A)** Categoria é obrigatória em toda transação ("Outros" cobre o caso sem categoria óbvia).
- **(5A)** Nome de categoria personalizada: trim, 1–40 caracteres, único case-insensitive entre as personalizadas do usuário e vs. as padrão do mesmo tipo.

### Regras da transação

- **(6)** Valor: estritamente > 0, máximo R$ 10.000.000,00, centavos inteiros (AD-008).
- **(7)** Data: date-only (`YYYY-MM-DD`), passado e futuro permitidos, janela 2000-01-01 → +100 anos.
- **(8)** Descrição: **opcional** (mudança vs. default proposto); quando presente, trim + máximo 140 caracteres; listagem exibe "—" quando ausente.

### Listagem e navegação

- **(9)** Ordenação: data decrescente, desempate por criação mais recente primeiro.
- **(10)** Paginação **numerada** (mudança vs. default proposto de "carregar mais"): páginas de 20 itens, navegação numerada com página atual destacada.
- **(11)** Rotas: `/app/transactions` e `/app/categories`.
- **(12B)** Formulário de transação em **modal sobre a listagem** (mudança vs. discrição do agente).

### Escopo

- **(13)** Usuário questionou a exclusão fora do escopo → **exclusão de transações incluída** nesta feature (story P1: confirmação obrigatória, hard delete, só o próprio dado).
- **(14)** Confirmado: E2E de isolamento com 2 contas fica no item 5 (`projections`); aqui isolamento é coberto por testes de integração (AD-012).

### 2ª revisão (2026-07-18, mesma data)

- **Exclusão de categoria personalizada incluída**, com regras definidas pelo usuário:
  - Bloqueada enquanto houver transações vinculadas à categoria.
  - Quando sem uso: confirmação exige digitar o texto exato **"excluir permanentemente"** e o diálogo deve deixar claro que **não existe reversão**.
  - Só categorias personalizadas do próprio usuário; padrão (globais) não são excluíveis.
  - Integridade garantida por FK RESTRICT no banco (corrida checagem × confirmação).
- **Edição de transações incluída** — usuário considera edição ponto essencial do MVP para este tipo de produto. Story P1: mesmo modal do cadastro pré-preenchido, mesmas validações, re-filtro de categoria ao trocar tipo, só o próprio dado (AD-012).

### Agent's Discretion

- Detalhes visuais da distinção entrada/saída na listagem (cor/ícone/sinal) — desde que os dois tipos nunca sejam confundíveis.
- Componente/UX exatos do modal, do seletor de categoria e da confirmação de exclusão (shadcn/ui, AD-004).
- Formato exato da navegação numerada (ex.: elipse para muitas páginas).

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma — todas as 14 áreas apresentadas foram decididas pelo usuário; a tabela de Assumptions da spec está 100% confirmada (`Confirmed? = y`).

---

## Specific References

Nenhuma referência externa de produto citada — aberto a abordagens padrão dentro do stack (AD-004: Tailwind + shadcn/ui).

---

## Deferred Ideas

- Edição (renomear/mudar tipo) e arquivamento de categorias — renomear categoria em uso muda retroativamente o rótulo de transações passadas; iteração futura.
- Filtros, busca e agrupamento na listagem — visão mensal chega com `projections` (item 5).
