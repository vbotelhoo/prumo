# `shared`

## Responsabilidade

Kernel compartilhado do monolito modular: tipos de dinheiro (`Money`), datas, utilitários e componentes de UI genéricos (shadcn/ui + Tailwind). **Não contém regra de negócio de nenhum domínio.**

## API pública

- `getEnv(source?)` / `type Env` — valida as env vars da aplicação (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) com Zod; lança erro nomeando as vars ausentes/inválidas.
- `prisma` — singleton do Prisma Client (padrão global, seguro para hot-reload em dev).
- `money`, `moneySchema`, `addMoney`, `subtractMoney`, `formatBRL` / `type Money` — tipo `Money` (centavos inteiros) e helpers de aritmética/formatação BRL (AD-008). Único caminho para operar valores monetários.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardAction`, `CardFooter` — componentes shadcn/ui reexportados para uso pelos módulos e por `src/app`.

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: nada de `src/modules/*` ou `src/app` — `shared` é a base do grafo, sem dependências de domínio.
- **É importável por**: todos os módulos (`auth`, `categories`, `transactions`, `commitments`, `projections`) e por `src/app`, sempre através deste `index.ts`.
- Import de arquivos internos deste diretório por qualquer código fora dele é uma violação de fronteira.
