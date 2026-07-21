# AGENTS.md

## Comandos

```bash
pnpm test:unit                    # unitários — sem deps externas
pnpm test:integration             # integração — Docker ou DATABASE_URL exportada
pnpm test:e2e                     # E2E — DATABASE_URL + BETTER_AUTH_SECRET + BETTER_AUTH_URL
pnpm lint && pnpm typecheck       # obrigatório antes de qualquer commit
pnpm prisma migrate dev           # após alterar prisma/schema.prisma localmente
```

## Antes de abrir PR ou mergear em main

Gate obrigatório, sempre os 4 juntos e verdes — nunca abra PR nem mergeie em `main` com qualquer um pulado ou vermelho:

```bash
pnpm lint && pnpm typecheck   # 1. Lint & Typecheck
pnpm test:unit                # 2. Unit
pnpm test:integration         # 3. Integration
pnpm test:e2e                 # 4. E2E
```

Rodar só unit+integration (ou pular e2e por ser mais lento) já causou PR com página quebrada em produção (rota sem `headers()` na sessão, campo de formulário sem label associado) — só o E2E real no browser pega esses casos, typecheck/lint/unit passam mesmo com a página 100% quebrada. Não pule.

**Ao rodar integration e e2e em sequência contra o mesmo Postgres local** (fora do CI, onde cada job tem seu próprio Postgres efêmero): specs de E2E não limpam os dados que criam (por padrão do design — cobrem o fluxo real, não são donas do banco). Se depois disso alguma suíte de integração falhar com `Foreign key constraint violated`/`P2002` ao limpar `category`/`user`, o banco de teste local está sujo de uma run de E2E anterior, não é regressão de código — rode a limpeza abaixo e re-teste antes de investigar mais:

```ts
// node -e com require('@prisma/client'), ordem por causa das FKs:
await prisma.installment.deleteMany({});
await prisma.commitment.deleteMany({});
await prisma.transaction.deleteMany({});
await prisma.session.deleteMany({});
await prisma.category.deleteMany({ where: { userId: { not: null } } });
await prisma.user.deleteMany({});
```

## Tooling

| Ferramenta | Notas |
|---|---|
| Node.js | ≥ 24 (`.nvmrc` + `engines`); use `nvm use`, `fnm use` ou `n auto` |
| pnpm | fixado em `packageManager`; ative com `corepack enable` |
| Prisma CLI | `pnpm prisma <cmd>` — nunca instale globalmente |

## Boundaries

**Sempre**
- Use `money(cents)` de `@/shared` para todo valor monetário — nunca `number` cru nem `Decimal`.
- Importe outro módulo apenas via `index.ts` (API pública); jamais de arquivos internos.
- Regras de negócio vivem em `domain/` ou `services/`; `domain/` não importa Prisma, Next.js nem React.
- Componentes React chamam `actions/` do próprio módulo — nunca o banco diretamente.
- CPF em fixtures de teste com checksum válido (dois dígitos verificadores pelo algoritmo oficial).

**Pergunte**
- Módulo novo → precisa de entrada explícita no grafo do `eslint.config.mjs`; sem ela o lint falha por design.
- Dependência de runtime em `shared` → afeta todos os módulos; confirme antes de instalar.
- Schema Prisma alterado → `migrate dev` (local) ou `migrate deploy` (CI/produção)?

**Nunca**
- Float para dinheiro: `price: 19.99` — use `money(1999)`.
- Import de interno de outro módulo: `import { x } from "@/modules/categories/domain/..."`.
- Lógica de negócio em componente React, server action ou rota `app/`.
- Query sem `userId` obrigatório quando o dado é escopado por usuário (AD-012).
- Push direto em `main`; toda mudança via pull request com CI verde.

## Regras testáveis

**Money é branded integer em centavos (AD-008):**
```ts
import { money, addMoney, formatBRL } from "@/shared";
money(100)                       // Money — 100 centavos
money(1.5)                       // lança ZodError — float rejeitado pelo moneySchema
addMoney(money(10), money(20))   // → money(30), nunca 0.30000...
formatBRL(money(123456))         // "R$\u00A01.234,56"
```

**Invariante de parcelamento — soma das parcelas === total (AD-009):**
```ts
// R$ 10,00 em 3x → parcelas = [334, 333, 333] centavos
// primeira parcela absorve a diferença de centavos; sum(parcelas) === total sempre
```

**Testes de integração exigem sessão real:**
```ts
// 1. signUpCore() retorna { responseHeaders } com Set-Cookie
// 2. buildCookieHeader(result) extrai o par nome=valor de cada cookie
// 3. passe o resultado como header Cookie em todas as actions subsequentes
// Padrão completo: src/modules/categories/__tests__/create-category.integration.test.ts
```

**Zod valida na fronteira, TypeScript no interior:**
```ts
// domain/ define o schema; actions/ chama .safeParse() e retorna { ok, error }
// nunca passe dados não validados para services/ ou data/
```

## Ponteiros

| O quê | Onde |
|---|---|
| Decisões arquiteturais (AD-001..012) | `.specs/STATE.md` |
| Fronteiras, grafo de módulos, regras invioláveis | `docs/ARCHITECTURE.md` |
| Pirâmide de testes, convenções de nomenclatura, CI | `docs/TESTING.md` |
| Regras de domínio críticas (Money, parcelas, isolamento) | `PROJECT.md` §"Regras de domínio críticas" |
| Tipo `Money` e helpers BRL | `src/shared/money/index.ts` |
| Padrão CPF válido + sessão em integração | `src/modules/categories/__tests__/create-category.integration.test.ts` |
| Lições aprendidas em features anteriores | `.specs/LESSONS.md` |
