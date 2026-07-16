# `shared`

## Responsabilidade

Kernel compartilhado do monolito modular: tipos de dinheiro (`Money`), datas, utilitários e componentes de UI genéricos (shadcn/ui + Tailwind). **Não contém regra de negócio de nenhum domínio.**

## API pública

Hoje vazia (placeholder criado no setup — Fase 1). O tipo `Money` (centavos + formatação BRL), validação de env vars e o singleton do Prisma client chegam em tasks futuras (Fase 2/3).

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: nada de `src/modules/*` ou `src/app` — `shared` é a base do grafo, sem dependências de domínio.
- **É importável por**: todos os módulos (`auth`, `categories`, `transactions`, `commitments`, `projections`) e por `src/app`, sempre através deste `index.ts`.
- Import de arquivos internos deste diretório por qualquer código fora dele é uma violação de fronteira.
