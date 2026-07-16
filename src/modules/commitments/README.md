# Módulo `commitments`

## Responsabilidade

Compras parceladas e dívidas/financiamentos de longo prazo: cada compromisso gera um registro pai + N parcelas materializadas (AD-009), com vencimento e status (prevista | paga) próprios.

## API pública

Hoje vazia (placeholder criado no setup — Fase 1). Exports públicos (tipos, schemas Zod, casos de uso) chegam na feature `commitments` do roadmap.

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: `shared`, `auth`, `categories` (via seus respectivos `index.ts`).
- **É importável por**: `projections`, e por `src/app` (camada de composição), sempre através deste `index.ts`.
- Import de arquivos internos deste módulo (`domain/`, `data/`, `services/`, `actions/`, `components/`) por qualquer código fora dele é uma violação de fronteira.
