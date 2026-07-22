# Módulo `projections`

## Responsabilidade

Previsibilidade mensal: agrega dados de `transactions` e `commitments` para calcular, por mês (atual e futuros), entradas previstas, saídas previstas (incluindo parcelas) e saldo projetado. Módulo **somente-leitura** — nunca escreve dados de outros módulos.

## API pública

- **Domain**: tipo `MonthlyProjection`; helpers de mês `parseMonthParam`, `getCurrentMonth`, `previousMonth`, `nextMonth`, `formatMonthLabel` (`domain/month.ts`).
- **Services**: `getMonthlyProjection` — orquestra as queries agregadas de `transactions` e `commitments` (via suas APIs públicas, AD-016) e calcula entradas/saídas previstas, saldo projetado e total comprometido do mês.
- **Components**: `ProjectionSummary`, `MonthNavigator` — UI consumida pela rota `/app/projections` (`src/app/app/projections/page.tsx`).

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: `shared`, `auth`, `categories`, `transactions`, `commitments` (via seus respectivos `index.ts`) — apenas leitura das APIs públicas, nunca escrita.
- **É importável por**: nenhum outro módulo de domínio; apenas por `src/app` (camada de composição), através deste `index.ts`.
- Import de arquivos internos deste módulo (`domain/`, `data/`, `services/`, `actions/`, `components/`) por qualquer código fora dele é uma violação de fronteira.
