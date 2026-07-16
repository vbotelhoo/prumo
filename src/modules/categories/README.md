# Módulo `categories`

## Responsabilidade

Categorias de transações: categorias padrão do sistema e categorias personalizadas por usuário, usadas para classificar entradas e saídas.

## API pública

Hoje vazia (placeholder criado no setup — Fase 1). Exports públicos (tipos, schemas Zod, casos de uso) chegam na feature `categories` do roadmap.

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: `shared`, `auth` (via seus respectivos `index.ts`).
- **É importável por**: `transactions`, `commitments`, e por `src/app` (camada de composição), sempre através deste `index.ts`.
- Import de arquivos internos deste módulo (`domain/`, `data/`, `services/`, `actions/`, `components/`) por qualquer código fora dele é uma violação de fronteira.
