# Estratégia de testes

O Prumo segue uma pirâmide de testes obrigatória (AD-011): cada camada da arquitetura tem a suíte que a cobre, e nenhuma feature é considerada concluída sem os testes correspondentes passando.

## A pirâmide

1. **Unitários (Vitest)** — cobrem `domain/` e `services/` de cada módulo (e a lógica pura de `shared`, como `Money` e `env`). Sem Next.js, sem banco, sem I/O. Prioridade máxima para invariantes de negócio (ex.: dinheiro nunca em float, arredondamento de parcelas).
2. **Integração (Vitest + PostgreSQL real descartável)** — cobrem `data/` (repositórios Prisma) e `actions/` contra um Postgres real. Validam queries, migrations e contratos Zod na fronteira.
3. **End-to-end (Playwright)** — fluxos críticos no navegador, contra a aplicação completa (build de produção) + banco de teste. No setup, cobre o único fluxo existente: a home responde 200 e exibe "Prumo".

## Execução local

| Suíte | Comando | Pré-requisito |
| ----- | ------- | -------------- |
| Unitários | `pnpm test:unit` | Nenhum |
| Integração | `pnpm test:integration` | Docker rodando (sobe PostgreSQL via Testcontainers automaticamente) **ou** `DATABASE_URL` de teste exportada apontando para um Postgres já disponível |
| E2E | `pnpm test:e2e` | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` exportadas (o Playwright builda e inicia a app de produção contra esse banco via `webServer`) |

Sem Docker e sem `DATABASE_URL`, `pnpm test:integration` falha com uma mensagem explicando as duas opções — nunca com timeout silencioso.

## Execução no CI

O workflow `.github/workflows/ci.yml` roda as três suítes em jobs dedicados:

- `unit`: `pnpm vitest run --project unit --coverage`, sem serviços externos.
- `integration`: service container `postgres:17`, `prisma migrate deploy`, depois `pnpm test:integration` contra a `DATABASE_URL` do service container.
- `e2e`: mesmo service container Postgres, `prisma migrate deploy` antes de o Playwright buildar/iniciar a app, depois `pnpm test:e2e`; em falha, o relatório HTML do Playwright é enviado como artifact (`actions/upload-artifact`, `if: failure()`).

## Convenções de nomenclatura

- `*.test.ts` — teste unitário, filtrado pelo project `unit` do Vitest.
- `*.integration.test.ts` — teste de integração, filtrado pelo project `integration` do Vitest.
- Ambos co-localizados em `__tests__/` dentro do módulo (ou `shared`) que testam.
- `e2e/*.spec.ts` — testes Playwright, fora de `src/`.

## Independência entre testes

Nenhum teste pode depender da ordem de execução ou de estado deixado por outro teste (spec.md, story "Pirâmide de testes operacional", AC-5). Cada teste de integração/E2E deve poder rodar isolado e produzir o mesmo resultado. Consequências práticas:

- Não compartilhar fixtures mutáveis entre `it`/`test` sem resetá-las.
- Não assumir que um teste anterior deixou dados no banco — cada teste cria o que precisa ou consulta apenas o que a suíte controla.
- A suíte de integração e a suíte E2E compartilham um único banco/app por execução (não são parallel-safe entre si — ver Parallelism Assessment em `.specs/features/setup/tasks.md`), mas os testes dentro de cada suíte não devem depender de ordem.
