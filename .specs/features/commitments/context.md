# Commitments Context

**Gathered:** 2026-07-19
**Spec:** `.specs/features/commitments/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Módulo `commitments` (roadmap item 4): compras parceladas e financiamentos/dívidas de longo prazo. Um compromisso (registro pai) gera N parcelas materializadas (registros filhos) com vencimento e status (prevista | paga) próprios — AD-009. Cobre criar (dois modos de entrada), listar com acompanhamento de quitação, marcar/desmarcar parcela paga, editar e excluir. Vive em `/app/commitments`, não toca a listagem de transações avulsas. Não inclui juros/amortização, compromissos de entrada, ou agregação mensal (item 5).

---

## Implementation Decisions

### Modelagem: tipo único, dois modos de entrada

- Um só domínio de compromisso, com um campo de **modo de entrada**:
  - `parcelada`: usuário informa **valor total** + N → parcela = piso(total/N), sobra de centavos na 1ª.
  - `financiamento`: usuário informa **parcela fixa** + N → total = parcela × N, todas as parcelas iguais.
- Ambos materializam N parcelas com status próprio. A diferença é apenas de qual valor deriva qual.
- O modo/origem é persistido para que a edição futura preserve a semântica de redistribuição.

### Vencimentos das parcelas

- 1ª parcela vence na **data informada** pelo usuário.
- Parcelas seguintes: **mesmo dia** nos meses subsequentes.
- Dia inexistente no mês (ex.: 31 em fevereiro) → **ajusta para o último dia do mês**.

### Categoria e tipo

- Compromisso é **sempre saída** (despesa) no MVP.
- **Uma** categoria de saída (padrão ou personalizada do usuário) escolhida na criação, **armazenada só no compromisso pai** e aplicada a **todas** as parcelas (Opção B — decisão do usuário 2026-07-19). Trocar categoria afeta o compromisso inteiro; não há "só futuras" para categoria.
- Categoria consumida de `categories` via `index.ts` (AD-010); FK RESTRICT no compromisso protege categoria em uso.

### Marcar como paga

- **Toggle reversível**: clicar marca paga; clicar de novo volta a prevista.
- **Ordem livre**: qualquer parcela pode ser paga em qualquer ordem.
- **Sem data de pagamento** no MVP.

### Edição

- **Tudo editável**: valor, categoria, descrição, número de parcelas, vencimentos.
- **Parcelas pagas são histórico imutável** — toda mudança opera só sobre as **previstas**.
- Ao editar o **valor** com múltiplas previstas, perguntar: **"só as previstas futuras"** ou **"todas as previstas"**. Trocar **categoria** aplica sempre ao compromisso inteiro (sem escopo — Opção B).
- Redistribuição de valor mantém soma(pagas) + soma(previstas afetadas) = novo total, com a sobra de centavos na 1ª parcela prevista afetada.
- Alterar N adiciona/remove parcelas **previstas** ao final; nunca remove pagas; rejeita se novo N < nº de pagas ou novo total < soma paga.

### Exclusão

- Confirmação obrigatória (nunca clique único).
- Remove as parcelas **previstas**; **pagas são preservadas como histórico**.
- Se não sobrar nenhuma parcela paga, remove o compromisso inteiro.

### Navegação e acompanhamento de quitação

- Rota própria **`/app/commitments`** (path em inglês — AD-014); parcelas **não** aparecem em `/app/transactions`.
- Cada compromisso exibe **progresso pagas/total**, **valor já pago**, **saldo devedor** (soma das previstas restantes) e barra de progresso; estado **quitado** a 100%.

### Agent's Discretion

Áreas onde o agente definiu o default (registradas na tabela de Assumptions da spec, todas passíveis de ajuste no Design/UAT):

- Faixa de N: 2–360; teto de valor total: R$ 10.000.000,00; parcela mínima: R$ 0,01.
- Descrição obrigatória (1–140 chars) — diferente da transação avulsa (lá é opcional).
- Janela de data da 1ª parcela: 2000-01-01 a +100 anos (passado permitido para financiamento em andamento).
- Layout exato da lista (cards vs. tabela, expandir inline vs. detalhe) e do formulário (modal vs. página) — decisão do Design, seguindo os padrões da feature 3 (`transactions` usa modal sobre a listagem).

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma gray area foi declinada; todas as perguntas foram respondidas. Os defaults do agente acima estão registrados na seção **Assumptions & Open Questions** da spec com rationale.

---

## Specific References

- **AD-009** (parcelas materializadas + arredondamento na 1ª parcela) e **AD-008** (dinheiro em centavos) são a base do domínio.
- Seguir os padrões já estabelecidos na feature 3 (`categories-transactions`): estrutura de módulo (`domain/`, `data/`, `actions/` com par `-core`/`-action`, `components/`), Zod na fronteira, `Money`/`formatBRL`/`parseBRL` do `shared`, modal de formulário sobre a listagem, `router.refresh()` após mutação (lição L-009).
- Lições candidatas do CI da feature 3 a honrar no Execute: seed/`tsx` no CI (L-007), fixtures de integração com CPF válido + cookie de sessão real (L-008), `getByRole` em vez de `getByText({selector})` no Playwright (L-006), `router.refresh()` em client components após mutação (L-009).

---

## Deferred Ideas

- Juros/amortização (SAC/Price), taxas e correção monetária — fase futura.
- Data de pagamento por parcela, parcelas de valor variável (entrada + N, parcela balão) — fora do MVP.
- Compromissos de **entrada** (recebíveis parcelados) — fora do MVP.
- Renegociação/antecipação com recálculo de juros — fase futura.
- Agregação mensal do comprometido (entra em `projections`, item 5).
