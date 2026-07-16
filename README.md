# Prumo

> Aplicação web de controle de finanças pessoais com foco em previsibilidade: centralize receitas, despesas, parcelamentos e financiamentos, e veja quanto dos seus próximos meses já está comprometido.

**Tagline**: Prumo — Sua vida financeira alinhada.

[![CI](https://github.com/vbotelhoo/prumo/actions/workflows/ci.yml/badge.svg)](https://github.com/vbotelhoo/prumo/actions/workflows/ci.yml)

## O nome e seu significado

"Prumo" vem do instrumento usado na construção civil para verificar o alinhamento vertical perfeito — e da expressão popular "estar no prumo": estar em ordem, alinhado, equilibrado. O nome traduz a promessa do produto: tirar a vida financeira do improviso e colocá-la no prumo, com cada compromisso futuro visível e sob controle.

## Problema que resolve

Pessoas perdem o controle do orçamento porque compras parceladas e financiamentos espalham compromissos por vários meses futuros, e nenhum app simples mostra claramente "quanto do meu dinheiro dos próximos meses já está comprometido". O objetivo central do Prumo é dar ao usuário previsibilidade dos gastos futuros, centralizando todas as movimentações financeiras em um só lugar.

## Como rodar localmente

### Pré-requisitos

- **Node.js 24 (Active LTS)** — versão fixada em `.nvmrc` e em `engines` do `package.json`. Instale a versão correta com o gerenciador de sua preferência:
  - [`n`](https://github.com/tj/n): `n auto` (lê `.nvmrc` automaticamente com o plugin padrão, ou `n $(cat .nvmrc)`)
  - [`nvm`](https://github.com/nvm-sh/nvm): `nvm use` (lê `.nvmrc` automaticamente)
  - [`fnm`](https://github.com/Schniz/fnm): `fnm use` (lê `.nvmrc` automaticamente)
- **pnpm** — versão fixada em `packageManager` no `package.json`; com [Corepack](https://nodejs.org/api/corepack.html) habilitado (`corepack enable`), o `pnpm` correto é resolvido automaticamente.
- **PostgreSQL** — uma instância local (ou Docker, usado automaticamente pela suíte de integração via Testcontainers).

### Setup

1. Clone o repositório e instale as dependências:

   ```bash
   pnpm install
   ```

2. Crie um arquivo `.env` na raiz com as três variáveis exigidas pela aplicação:

   ```bash
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/prumo"
   BETTER_AUTH_SECRET="um-valor-secreto-qualquer-para-desenvolvimento"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

   Sem essas variáveis (ou com valores inválidos), a aplicação falha ao iniciar os subsistemas que dependem delas com uma mensagem listando exatamente o que está faltando.

3. Rode as migrations contra o Postgres local:

   ```bash
   pnpm prisma migrate dev
   ```

4. Inicie a aplicação:

   ```bash
   pnpm dev
   ```

## Como executar os testes

| Suíte | Comando | Observações |
| ----- | ------- | ----------- |
| Unitários | `pnpm test:unit` | Sem dependências externas. |
| Integração | `pnpm test:integration` | Precisa de um Postgres real: com **Docker** rodando, sobe um container descartável automaticamente (Testcontainers); sem Docker, defina `DATABASE_URL` apontando para um Postgres de teste já disponível. Sem nenhuma das duas opções, o comando falha com uma mensagem explicando o que fazer. |
| E2E | `pnpm test:e2e` | Builda e inicia a aplicação de produção (via Playwright `webServer`) contra o Postgres de teste; exporte `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` antes de rodar. |

Detalhes da estratégia de testes (pirâmide, execução no CI, convenções) em [`docs/TESTING.md`](docs/TESTING.md).

## Arquitetura

Monolito modular com fronteiras entre módulos reforçadas por lint. Visão completa, grafo de dependências e regras de fronteira em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Cada módulo em `src/modules/*` (e `src/shared`) tem seu próprio `README.md` com responsabilidade, API pública e dependências permitidas.

## CI

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda em todo push/PR para `main`, com 5 jobs: lint + typecheck, testes unitários, testes de integração, testes E2E e build de produção. Merge em `main` só deve ocorrer com o workflow verde (ver branch protection abaixo).

## Deploy no Railway

Configuração de deploy (código): `railway.json` define o build (`pnpm install --frozen-lockfile && pnpm build`) e o start (`pnpm start:prod`, que roda `prisma migrate deploy && next start` — o `&&` garante que o deploy aborta e não serve tráfego se a migration falhar).

A criação do serviço/projeto e a conexão com o PostgreSQL gerenciado são passos manuais, feitos uma única vez pelo mantenedor com acesso à conta do Railway:

1. Criar um projeto no Railway com um serviço chamado `prumo`, conectado a este repositório na branch `main`.
2. Adicionar um serviço PostgreSQL gerenciado ao mesmo projeto.
3. Configurar as variáveis de ambiente do serviço `prumo`:
   - `DATABASE_URL` — referência ao Postgres gerenciado (o Railway injeta automaticamente via variável de referência, ex.: `${{Postgres.DATABASE_URL}}`).
   - `BETTER_AUTH_SECRET` — valor secreto gerado para produção (nunca reaproveitar o valor usado em desenvolvimento/CI).
   - `BETTER_AUTH_URL` — URL pública do serviço no Railway.
4. Após o primeiro deploy, confirmar que a URL pública responde 200 com o placeholder do Prumo.

### Branch protection recomendada no GitHub

- Proteger a branch `main`: exigir que o workflow `ci.yml` passe (todos os 5 jobs) antes de permitir merge.
- Exigir revisão de pull request antes do merge.
- Não permitir push direto para `main`.
