# Módulo `transactions`

## Responsabilidade

Entradas (receitas) e saídas (despesas) avulsas: cadastro, data, valor, descrição e categoria de cada movimentação financeira do usuário.

## API pública

Hoje vazia (placeholder criado no setup — Fase 1). Exports públicos (tipos, schemas Zod, casos de uso) chegam na feature `transactions` do roadmap.

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: `shared`, `auth`, `categories` (via seus respectivos `index.ts`).
- **É importável por**: `projections`, e por `src/app` (camada de composição), sempre através deste `index.ts`.
- Import de arquivos internos deste módulo (`domain/`, `data/`, `services/`, `actions/`, `components/`) por qualquer código fora dele é uma violação de fronteira.
