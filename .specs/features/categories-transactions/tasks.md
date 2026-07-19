# Categories + Transactions Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/categories-transactions/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase sampling + project guidelines. Guidelines found: `vitest.config.ts` (projects: unit / integration, `fileParallelism: false`), `playwright.config.ts` (fullyParallel: true on spec level). Strong defaults applied where no explicit coverage threshold is configured.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain schemas / types / constants | unit | All branches; 1:1 to spec ACs; every listed edge case (trim, limits, enum values) | `src/modules/*/__tests__/*.test.ts` | `pnpm test:unit` |
| Shared utility functions (`parseBRL`) | unit | All branches; all spec-listed input formats + null cases + boundary values | `src/shared/__tests__/*.test.ts` | `pnpm test:unit` |
| Data layer / repository | integration | All public functions: happy path + error cases + isolation (AD-012 per every query) | `src/modules/*/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Actions (core functions — testable layer) | integration | All branches: happy path + every listed edge case + error paths + AD-012 isolation | `src/modules/*/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| Seed / global DB setup | integration | Idempotence: run 2× → no duplicates; correct category count (13) | `src/shared/__tests__/*.integration.test.ts` | `pnpm test:integration` |
| React components (`"use client"`) | none | — (build gate only; E2E covers UI behavior end-to-end) | — | `pnpm build && pnpm lint` |
| Server components / App Router pages | none | — (build gate only; E2E covers user journey) | — | `pnpm build && pnpm lint` |
| Prisma schema / migrations / shadcn setup | none | — (build gate only: `prisma generate` + `pnpm build` pass) | — | `pnpm build && pnpm lint` |
| E2E user flows | e2e | Full flow: login → create entrada → create saída → both visible in list | `e2e/*.spec.ts` | `pnpm test:e2e` |

## Parallelism Assessment

> Generated from `vitest.config.ts` (integration project) and `playwright.config.ts`.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit | Yes | Pure functions; no shared state; no DB | All unit tests are pure Zod/function calls with no side effects |
| integration | **No** | Single shared PostgreSQL (Testcontainers or `DATABASE_URL`); no per-test schema isolation | `vitest.config.ts` → integration project: `fileParallelism: false` (explicit comment explains why) |
| e2e | No | Shared Next.js dev server; Playwright `fullyParallel: true` per spec-file, but E2E tests hit live DB state | `playwright.config.ts` `webServer` with shared `DATABASE_URL`; E2E creates its own users to avoid contamination |

## Gate Check Commands

> Generated from `package.json` scripts.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test:unit` |
| Full | After tasks with integration tests | `pnpm test:integration` |
| Build | After schema/component/config-only tasks (no tests) | `pnpm build && pnpm lint` |
| E2E | Final gate after all pages + components are wired | `pnpm test:e2e` |

---

## Execution Plan

### Phase 1: Database Schema (Sequential)

Establish the Prisma models and migration before any other layer can reference DB types.

```
T1 → T2
```

### Phase 2: Domain + Shared + Seed (Parallel + Sequential)

T3–T6 have no dependencies and can start immediately (even in parallel with Phase 1's T1→T2 chain). T7 must wait for T2 (migration must be applied before seed runs against the DB in global-setup).

```
           ┌── T3 [P] ──┐
           ├── T4 [P] ──┤
(no dep) ──┼── T5 [P] ──┼──┐
           └── T6 [P] ──┘  ├── Phase 2 done
T2 ──────────── T7 ─────────┘
```

### Phase 3: Data Layers (Sequential)

Both tasks have integration tests; integration is not parallel-safe (`fileParallelism: false`).

```
T8 → T9
```

T8 depends on T2 (migration), T4 (categories domain types), T7 (seed run in global-setup).
T9 depends on T2, T5 (transactions domain types), T7, T8 (sequential: integration tests).

### Phase 4: Actions + Module APIs (Sequential)

All action tasks have integration tests. T12 and T15 are build-gate-only (public API re-exports) but depend on the action tasks preceding them.

```
T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 5: Components + Pages + E2E (Parallel + Sequential)

Components have no tests (build gate only), so [P] applies wherever there is no code dependency.

```
T16 [P] ──┐
           ├── T18 ──→ T19 ──┐
T17 [P] ──┘                  │
                              ├──→ T26
T20 [P] ──────────────┐       │
T21 [P] ──────────────┤       │
T22 [P] ──────────────┼──→ T24 ──→ T25 ──┘
T23     ──────────────┘
```

---

> **Sub-agent offer:** This feature has **5 phases** (>3 threshold). During Execute, offer one worker per phase (sequential). Workers report a compact summary before the next is dispatched. The Verifier runs automatically after the last task regardless of phase count. See `tlc-spec-driven` skill → sub-agents.md for full mechanics.

---

## Task Breakdown

### T1: Prisma schema — Category + Transaction models

**What**: Add `Category` and `Transaction` models to `prisma/schema.prisma`; add `categories` and `transactions` relations to existing `User` model.
**Where**: `prisma/schema.prisma` (modify)
**Depends on**: None
**Reuses**: Existing `User` model; Prisma conventions already established in schema (String dates, no Prisma enums per AD decision)
**Requirement**: CAT-01, CAT-04, TXN-03, TXN-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `Category` model added with fields: `id` (cuid), `name` (String), `type` (String), `userId` (String? — null = padrão global), `transactions` (relation), `@@map("category")`
- [ ] `Transaction` model added with fields: `id` (cuid), `type` (String), `date` (String), `amount` (Int), `description` (String?), `categoryId` (String FK → Category `onDelete: Restrict`), `userId` (String FK → User), `createdAt` (DateTime default now), `updatedAt` (DateTime updatedAt), `@@map("transaction")`
- [ ] `User` model updated with `categories Category[]` and `transactions Transaction[]` relations
- [ ] `pnpm prisma generate` exits 0 (no schema errors)
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories-transactions): add Category and Transaction Prisma models`

---

### T2: Database migration with raw SQL partial indexes

**What**: Generate migration skeleton with `prisma migrate dev --create-only`, edit the generated SQL to add two partial functional indexes (case-insensitive uniqueness for default and custom categories), then apply.
**Where**: `prisma/migrations/<timestamp>_categories_transactions/migration.sql` (generated then edited)
**Depends on**: T1
**Reuses**: Prisma migration workflow already established in the project
**Requirement**: CAT-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Migration file created by `pnpm prisma migrate dev --create-only --name categories_transactions`
- [ ] SQL file manually edited to include after the `CREATE TABLE` statements:
  ```sql
  CREATE UNIQUE INDEX category_default_unique_name_type
    ON category (lower(name), type)
    WHERE user_id IS NULL;

  CREATE UNIQUE INDEX category_custom_unique_name_type_user
    ON category (lower(name), type, user_id)
    WHERE user_id IS NOT NULL;
  ```
- [ ] `pnpm prisma migrate dev` applies the migration successfully (exit 0)
- [ ] `pnpm prisma migrate status` shows no pending migrations
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories-transactions): add migration with partial unique indexes for category names`

---

### T3: `parseBRL` utility in `src/shared/money/` [P]

**What**: Add `parseBRL(raw: string): number | null` to `src/shared/money/index.ts` and export it from `src/shared/index.ts`; add unit tests covering all spec-listed input formats and edge cases.
**Where**: `src/shared/money/index.ts` (modify); `src/shared/index.ts` (modify); `src/shared/__tests__/money.test.ts` (modify — add parseBRL describe block)
**Depends on**: None
**Reuses**: `src/shared/money/index.ts` (existing `money`, `formatBRL`); existing test file structure
**Requirement**: TXN-04 (edge case: máscara BRL)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `parseBRL` implemented per design spec: removes `.`, replaces `,` with `.`, `parseFloat`, `Math.round(× 100)`; returns `null` on `isNaN`
- [ ] Exported from `src/shared/money/index.ts` and re-exported from `src/shared/index.ts`
- [ ] Unit tests cover: `"250,37"` → `25037`; `"1.234,56"` → `123456`; `"5000"` → `500000`; `"0,01"` → `1`; `"10000000,00"` → `1000000000`; `"abc"` → `null`; `""` → `null`; input without comma `"5000"` works
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: 8+ unit tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(shared): add parseBRL utility for BRL string → cents conversion`

---

### T4: Categories domain layer [P]

**What**: Create the full domain layer for `categories`: TypeScript types, Zod schemas, and error constants.
**Where**: `src/modules/categories/domain/types.ts` (create); `src/modules/categories/domain/schemas.ts` (create); `src/modules/categories/domain/constants.ts` (create); `src/modules/categories/__tests__/schemas.test.ts` (create)
**Depends on**: None
**Reuses**: Zod (already in deps); pattern from `src/modules/auth/domain/schemas.ts`
**Requirement**: CAT-03, CAT-04, CAT-05, CAT-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `types.ts` exports: `CategoryType = "entrada" | "saida"`, `Category` (id, name, type, userId), `CreateCategoryInput` (name, type)
- [ ] `schemas.ts` exports: `categoryTypeSchema = z.enum(["entrada", "saida"])`, `createCategoryInputSchema` (name: trim, min 1 "Nome obrigatório", max 40 "Máximo 40 caracteres"; type: categoryTypeSchema)
- [ ] `constants.ts` exports: `CATEGORY_NAME_IN_USE_ERROR`, `CATEGORY_IN_USE_ERROR`, `CATEGORY_NOT_FOUND_ERROR` (exact strings from design)
- [ ] Unit tests cover: name trim → valid; name empty → invalid with "Nome obrigatório"; name only spaces → invalid after trim; name 40 chars → valid; name 41 chars → invalid; type "entrada" → valid; type "saida" → valid; type "outro" → invalid
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: 8+ unit tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(categories): add categories domain layer (types, schemas, constants)`

---

### T5: Transactions domain layer [P]

**What**: Create the full domain layer for `transactions`: TypeScript types, Zod schemas, and error constants.
**Where**: `src/modules/transactions/domain/types.ts` (create); `src/modules/transactions/domain/schemas.ts` (create); `src/modules/transactions/domain/constants.ts` (create); `src/modules/transactions/__tests__/schemas.test.ts` (create)
**Depends on**: None
**Reuses**: Zod; `Money` type from `@/shared`; pattern from auth domain
**Requirement**: TXN-01, TXN-04, TXN-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `types.ts` exports: `Transaction` (id, type, date, amount: Money, description: string|null, categoryId, categoryName, userId, createdAt); `TransactionInput` (type, date, amountRaw: string, description?: string, categoryId)
- [ ] `schemas.ts` exports: `transactionTypeSchema`, `transactionInputSchema` with:
  - `type`: `z.enum(["entrada", "saida"])`
  - `date`: regex `^\d{4}-\d{2}-\d{2}$` + refine `≥ "2000-01-01"` and `≤ maxDate()` (+100 years from today, computed at call time)
  - `amountRaw`: `z.string().min(1, "Valor obrigatório")`
  - `description`: optional string, trim, max 140, empty string coerced to `undefined`
  - `categoryId`: `z.string().min(1, "Categoria obrigatória")`
- [ ] `constants.ts` exports: `TRANSACTION_NOT_FOUND_ERROR`, `INVALID_AMOUNT_ERROR`, `INVALID_CATEGORY_ERROR`
- [ ] Unit tests cover: valid date `"2025-03-15"` → valid; date `"1999-12-31"` (before 2000) → error; date `"2000-01-01"` (boundary inclusive) → valid; date future within 100 years → valid; date `"not-a-date"` → error; description absent → valid; description `""` → coerced to undefined; description 140 chars → valid; description 141 chars → error; amountRaw `""` → error; type `"invalido"` → error; type `"entrada"` → valid; type `"saida"` → valid
- [ ] Gate check passes: `pnpm test:unit`
- [ ] Test count: 13+ unit tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(transactions): add transactions domain layer (types, schemas, constants)`

---

### T6: shadcn/ui additions — Dialog, Select, Separator [P]

**What**: Add `Dialog`, `Select`, and `Separator` shadcn/ui components to `src/shared/components/ui/` and export them from `src/shared/index.ts`.
**Where**: `src/shared/components/ui/dialog.tsx` (create); `src/shared/components/ui/select.tsx` (create); `src/shared/components/ui/separator.tsx` (create); `src/shared/index.ts` (modify — add exports)
**Depends on**: None
**Reuses**: `src/shared/components/ui/` (button, card, input, label already exist); shadcn install pattern from auth feature
**Requirement**: TXN-01 (modal), CAT-03 (form select), CAT-07 (dialog)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `npx shadcn@latest add dialog select separator` executed; components added to `src/shared/components/ui/`
- [ ] `dialog`, `select`, `separator` exports added to `src/shared/index.ts`
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(shared): add Dialog, Select, Separator shadcn/ui components`

---

### T7: Prisma seed + vitest global-setup update

**What**: Create idempotent seed for 13 default categories; update `vitest.global-setup.ts` to call the seed after migration; add integration test verifying idempotence.
**Where**: `prisma/seed.ts` (create); `package.json` (modify — add `prisma.seed` script); `vitest.global-setup.ts` (modify — add seed call); `src/shared/__tests__/seed.integration.test.ts` (create)
**Depends on**: T2
**Reuses**: `prisma` client from `@/shared/db`; Testcontainers global-setup pattern from `vitest.global-setup.ts`; `prisma.category.createMany({ skipDuplicates: true })` pattern
**Requirement**: CAT-01, CAT-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `prisma/seed.ts` exports `seed()` function + calls it when run as main script; contains `DEFAULT_CATEGORIES` array with exactly 9 `saida` entries (Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Assinaturas e serviços, Outros) and 4 `entrada` entries (Salário, Renda extra, Investimentos, Outros); uses `createMany({ skipDuplicates: true })`; all entries have `userId: null`
- [ ] `package.json` `prisma.seed` field set to `"tsx prisma/seed.ts"`
- [ ] `vitest.global-setup.ts` calls `seed()` after `prisma migrate deploy`, using the same `DATABASE_URL` set for the container
- [ ] Integration test: first seed run → exactly 13 categories in DB with `userId = null`; second seed run (call `seed()` again) → still 13 categories (no duplicates added); `prisma.category.count()` = 13 after both runs
- [ ] Gate check passes: `pnpm test:integration`
- [ ] Test count: 3+ integration tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): add idempotent default categories seed and update global-setup`

---

### T8: Categories data layer (`categories-repository.ts`)

**What**: Implement all 6 repository functions for the `categories` module with full AD-012 compliance; add integration tests covering all functions.
**Where**: `src/modules/categories/data/categories-repository.ts` (create); `src/modules/categories/__tests__/categories-repository.integration.test.ts` (create)
**Depends on**: T2, T4, T7
**Reuses**: `prisma` from `@/shared`; `Category`, `CategoryType` from `categories/domain/types`; isolation pattern from `src/modules/auth/__tests__/sign-up.integration.test.ts`
**Requirement**: CAT-04, CAT-06, CAT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `listCategoriesByUser(userId)`: returns all default categories (`userId: null`) + all custom categories of `userId`; ordered by name; does NOT return other users' custom categories
- [ ] `findCategoryForUser(categoryId, userId, typeFilter?)`: returns Category if it's a default OR belongs to `userId`; returns `null` if it's another user's custom category; returns `null` if `typeFilter` provided and `category.type !== typeFilter`
- [ ] `isCategoryNameTaken(name, type, userId)`: returns `true` if name matches (case-insensitive, `mode: "insensitive"`) any default category of the same type OR any of the user's own custom categories of the same type; `false` otherwise
- [ ] `isCategoryInUse(categoryId)`: returns `true` if any transaction references this category; `false` otherwise
- [ ] `createCategory({ name, type, userId })`: creates and returns a Category with `userId` set
- [ ] `deleteCategory(categoryId, userId)`: uses `deleteMany({ where: { id: categoryId, userId } })` (count 0 → throws AppError with CATEGORY_NOT_FOUND_ERROR, covering: non-existent, default (userId=null), other user's); FK Restrict handled upstream in the action
- [ ] Integration tests cover: `listCategoriesByUser` returns defaults + own custom, not other user's; `findCategoryForUser` finds default; finds own custom; returns null for other user's custom; returns null for type mismatch; `isCategoryNameTaken` true for same-name same-type (case-insensitive); false for different type; true when matches a default; `isCategoryInUse` true with transaction; false without; `createCategory` correct fields; `deleteCategory` deletes own category; throws on other user's category ID
- [ ] Gate check passes: `pnpm test:integration`
- [ ] Test count: 12+ integration tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): add categories repository with isolation and integration tests`

---

### T9: Transactions data layer (`transactions-repository.ts`)

**What**: Implement all 5 repository functions for the `transactions` module with full AD-012 compliance; add integration tests.
**Where**: `src/modules/transactions/data/transactions-repository.ts` (create); `src/modules/transactions/__tests__/transactions-repository.integration.test.ts` (create)
**Depends on**: T2, T5, T7, T8
**Reuses**: `prisma` from `@/shared`; `Transaction` type from `transactions/domain/types`; `PAGE_SIZE = 20` constant; `money()` from `@/shared`; same isolation pattern as T8
**Requirement**: TXN-03, TXN-06, TXN-07, TXN-08, TXN-09, TXN-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `listTransactions(userId, page)`: returns `{ items, total, page, totalPages }`; `items` ordered by `[{ date: "desc" }, { createdAt: "desc" }]` (deterministic); pagination: `skip: (page-1) * 20, take: 20`; `totalPages = Math.ceil(total / PAGE_SIZE) || 1`; each item includes `categoryName` (via `include: { category: { select: { name: true } } }`); only returns transactions for `userId`
- [ ] `createTransaction({ type, date, amount, description?, categoryId, userId })`: persists and returns the transaction with `categoryName` included
- [ ] `updateTransaction(id, userId, input)`: uses `updateMany({ where: { id, userId } })`; count 0 → throws AppError(TRANSACTION_NOT_FOUND_ERROR); returns updated transaction
- [ ] `deleteTransaction(id, userId)`: uses `deleteMany({ where: { id, userId } })`; count 0 → **silent** (idempotent for double-click per design spec edge case); does not throw
- [ ] `findTransactionById(id, userId)`: returns transaction if owned by `userId`; returns `null` otherwise
- [ ] Integration tests cover: `createTransaction` persists correct `amount` in cents; `listTransactions` ordered date desc + createdAt desc for tie; pagination (25 transactions → page 1 has 20, page 2 has 5); isolation (user A does not see user B's transactions); `listTransactions` includes `categoryName`; `updateTransaction` updates fields; `updateTransaction` throws for other user's transaction; `deleteTransaction` deletes own; `deleteTransaction` second call is silent (no throw); `findTransactionById` returns own transaction; returns null for other user's
- [ ] Gate check passes: `pnpm test:integration`
- [ ] Test count: 12+ integration tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add transactions repository with pagination, ordering and isolation`

---

### T10: Create-category action (core + wrapper)

**What**: Implement `create-category-core.ts` (testable logic) and `create-category-action.ts` (`"use server"` wrapper); add integration tests.
**Where**: `src/modules/categories/actions/create-category-core.ts` (create); `src/modules/categories/actions/create-category-action.ts` (create); `src/modules/categories/__tests__/create-category.integration.test.ts` (create)
**Depends on**: T4, T8
**Reuses**: `createCategoryInputSchema`, `CATEGORY_NAME_IN_USE_ERROR` from domain; `isCategoryNameTaken`, `createCategory` from repository; `auth.api.getSession` from auth module; discriminated `{ ok: true | false }` pattern from auth actions
**Requirement**: CAT-03, CAT-05, CAT-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `create-category-core.ts`: (1) `getSession` → `userId`; (2) `safeParse(createCategoryInputSchema)` → `{ ok: false, fieldErrors }` if invalid; (3) `isCategoryNameTaken` → `{ ok: false, error: CATEGORY_NAME_IN_USE_ERROR }` if true; (4) `createCategory` → `{ ok: true, category }`
- [ ] `create-category-action.ts`: `"use server"` wrapper calling core with `await headers()`; re-exports the action as `createCategoryAction`
- [ ] Integration tests cover: valid input → `{ ok: true, category }` with correct name/type/userId; duplicate name same type (case-insensitive own custom) → `{ ok: false }` with CATEGORY_NAME_IN_USE_ERROR; duplicate matching default category same type → `{ ok: false }`; name empty → `{ ok: false, fieldErrors.name }`; name > 40 chars → `{ ok: false }`; category created for user A is NOT returned when queried as user B (`listCategoriesByUser` isolation)
- [ ] Gate check passes: `pnpm test:integration`
- [ ] Test count: 6+ integration tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): add create-category action with Zod validation and isolation`

---

### T11: Delete-category action (core + wrapper)

**What**: Implement `delete-category-core.ts` and `delete-category-action.ts`; add integration tests including FK Restrict edge case.
**Where**: `src/modules/categories/actions/delete-category-core.ts` (create); `src/modules/categories/actions/delete-category-action.ts` (create); `src/modules/categories/__tests__/delete-category.integration.test.ts` (create)
**Depends on**: T4, T8, T10
**Reuses**: `isCategoryInUse`, `deleteCategory` from repository; `CATEGORY_IN_USE_ERROR`, `CATEGORY_NOT_FOUND_ERROR` from domain; session + wrapper pattern from T10
**Requirement**: CAT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `delete-category-core.ts`: (1) `getSession` → `userId`; (2) `isCategoryInUse(categoryId)` → `{ ok: false, error: CATEGORY_IN_USE_ERROR }` if true; (3) `deleteCategory(categoryId, userId)` — catch FK constraint error (Prisma P2003 / foreign key violation) → `{ ok: false, error: CATEGORY_IN_USE_ERROR }`; catch AppError(CATEGORY_NOT_FOUND_ERROR) → `{ ok: false, error: CATEGORY_NOT_FOUND_ERROR }`; (4) `{ ok: true }`
- [ ] `delete-category-action.ts`: `"use server"` wrapper
- [ ] Integration tests cover: category with 1 transaction → `{ ok: false, CATEGORY_IN_USE_ERROR }`; category without transactions (own custom) → `{ ok: true }`; default category (`userId = null`) → `{ ok: false, CATEGORY_NOT_FOUND_ERROR }`; other user's category → `{ ok: false }` (deleteMany returns 0 → CATEGORY_NOT_FOUND_ERROR); category removed from DB after deletion (verify with `findCategoryForUser` returning null)
- [ ] Gate check passes: `pnpm test:integration`
- [ ] Test count: 5+ integration tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(categories): add delete-category action with FK protection and isolation`

---

### T12: `categories/index.ts` — public API exports

**What**: Replace the placeholder `categories/index.ts` with the full public API re-exports as defined in design Component 8.
**Where**: `src/modules/categories/index.ts` (modify — replace placeholder)
**Depends on**: T10, T11
**Reuses**: All action, data, domain, component exports defined in T4, T8, T10, T11 (components not yet created — only export what exists; component exports added in T18 when CategoriesPageClient is created; pre-declare type to avoid circular)
**Requirement**: CAT-* (all)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Exports types: `Category`, `CategoryType`, `CreateCategoryInput`
- [ ] Exports schema: `categoryTypeSchema`
- [ ] Exports data functions: `listCategoriesByUser`, `findCategoryForUser`
- [ ] Exports actions: `createCategoryAction`, `deleteCategoryAction`
- [ ] `CategoriesPageClient` export deferred to T18 (component not yet created); comment placeholder present
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): publish categories module public API (index.ts)`

---

### T13: Create-transaction action (core + wrapper)

**What**: Implement `create-transaction-core.ts` and `create-transaction-action.ts`; add integration tests covering all validation branches and isolation.
**Where**: `src/modules/transactions/actions/create-transaction-core.ts` (create); `src/modules/transactions/actions/create-transaction-action.ts` (create); `src/modules/transactions/__tests__/create-transaction.integration.test.ts` (create)
**Depends on**: T3, T5, T9, T11, T12
**Reuses**: `transactionInputSchema`, `INVALID_AMOUNT_ERROR`, `INVALID_CATEGORY_ERROR` from domain; `parseBRL` from `@/shared`; `createTransaction` from repository; `findCategoryForUser` from `@/modules/categories`; session + wrapper pattern
**Requirement**: TXN-03, TXN-04, TXN-05, TXN-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `create-transaction-core.ts` flow: (1) `getSession` → `userId`; (2) `safeParse(transactionInputSchema)` → fieldErrors if invalid; (3) `parseBRL(amountRaw)` → null → `INVALID_AMOUNT_ERROR`; (4) `z.number().int().min(1).max(1_000_000_000).safeParse(amountCents)` → error if invalid (includes 0, negative, > R$10M); (5) `findCategoryForUser(categoryId, userId, type)` → null → `INVALID_CATEGORY_ERROR`; (6) `createTransaction` → `{ ok: true, transaction }`
- [ ] `create-transaction-action.ts`: `"use server"` wrapper
- [ ] Integration tests cover: valid entrada (amount stored in cents: R$ 5.000,00 → 500000); valid saida (R$ 250,37 → 25037); value 0 → `{ ok: false }`; value negative (`"-1,00"`) → `{ ok: false }`; value > R$10M (`"10000001,00"`) → `{ ok: false }`; non-parseable value `"abc"` → `{ ok: false, INVALID_AMOUNT_ERROR }`; date `"1999-12-31"` → `{ ok: false }`; date future within 100 years → `{ ok: true }`; description > 140 chars → `{ ok: false }`; description absent → accepted; category of other user → `{ ok: false, INVALID_CATEGORY_ERROR }`; category with wrong type (entrada transação, saida categoria) → `{ ok: false }`
- [ ] Gate check passes: `pnpm test:integration`
- [ ] Test count: 12+ integration tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add create-transaction action with full validation and BRL→cents`

---

### T14: Update-transaction + delete-transaction actions

**What**: Implement update and delete transaction action files (core + wrappers) for both operations; add integration tests in a single file per design spec (Component 18: `txn-mutations.integration.test.ts`).
**Where**: `src/modules/transactions/actions/update-transaction-core.ts` (create); `src/modules/transactions/actions/update-transaction-action.ts` (create); `src/modules/transactions/actions/delete-transaction-core.ts` (create); `src/modules/transactions/actions/delete-transaction-action.ts` (create); `src/modules/transactions/__tests__/txn-mutations.integration.test.ts` (create)
**Depends on**: T13
**Reuses**: Same validation flow as `create-transaction-core` (reuse or extract shared validator); `updateTransaction`, `deleteTransaction` from repository; `findCategoryForUser` from `@/modules/categories`; `TRANSACTION_NOT_FOUND_ERROR` from domain
**Requirement**: TXN-09, TXN-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `update-transaction-core.ts`: same Zod + parseBRL + centavos + category validation flow as create; calls `updateTransaction(id, userId, input)` — not-found/other-user → `{ ok: false, TRANSACTION_NOT_FOUND_ERROR }`; `{ ok: true, transaction }` on success
- [ ] `delete-transaction-core.ts`: (1) `getSession` → `userId`; (2) `deleteTransaction(id, userId)` (silent on double-delete per repo contract); (3) `{ ok: true }`; **Security boundary**: if the transaction never belonged to this user, `deleteMany` count = 0 — action returns `{ ok: true }` (idempotent/silent) rather than exposing existence (design edge case: "sem erro visível ao usuário")
- [ ] `update-transaction-action.ts` and `delete-transaction-action.ts`: `"use server"` wrappers
- [ ] Integration tests cover: update valid fields → `{ ok: true }` with new values reflected; update type without changing category (type mismatch) → `{ ok: false, INVALID_CATEGORY_ERROR }`; update other user's transaction → `{ ok: false, TRANSACTION_NOT_FOUND_ERROR }`; update invalid value → `{ ok: false }`; delete own transaction → `{ ok: true }` + transaction no longer in DB; double-delete (second call) → `{ ok: true }` (silent); delete other user's transaction ID → `{ ok: true }` (idempotent/silent, nothing deleted)
- [ ] Gate check passes: `pnpm test:integration`
- [ ] Test count: 8+ integration tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add update and delete transaction actions`

---

### T15: `transactions/index.ts` — public API exports

**What**: Replace the placeholder `transactions/index.ts` with the full public API re-exports per design Component 15.
**Where**: `src/modules/transactions/index.ts` (modify — replace placeholder)
**Depends on**: T13, T14
**Reuses**: All action and data exports from T9, T13, T14 (components deferred to T24)
**Requirement**: TXN-* (all)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Exports types: `Transaction`, `TransactionInput`
- [ ] Exports data function: `listTransactions`
- [ ] Exports actions: `createTransactionAction`, `updateTransactionAction`, `deleteTransactionAction`
- [ ] `TransactionsPageClient` export deferred to T24 (component not yet created); comment placeholder present
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): publish transactions module public API (index.ts)`

---

### T16: `CategorySection` + `CreateCategoryForm` components [P]

**What**: Create two client components for the categories page: `CategorySection` (displays a type section with default/custom sub-lists and delete trigger) and `CreateCategoryForm` (inline form for creating a custom category).
**Where**: `src/modules/categories/components/CategorySection.tsx` (create); `src/modules/categories/components/CreateCategoryForm.tsx` (create)
**Depends on**: T6, T12
**Reuses**: `Input`, `Label`, `Button` from `@/shared`; `Select` from `@/shared`; `Category`, `CategoryType` from `@/modules/categories`; `createCategoryAction` from `@/modules/categories`; `router.refresh()` pattern from auth form
**Requirement**: CAT-02, CAT-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `CategorySection` renders: section title (type label); two sub-sections: "Padrão" (categories with `userId = null`) and "Personalizadas" (categories with `userId ≠ null`); delete button rendered **only** on personalizadas; visual badge/label distinguishing padrão vs personalizada; accepts `categories: Category[]`, `type: CategoryType`, `onDeleteRequest: (cat: Category) => void` as props
- [ ] `CreateCategoryForm` (`"use client"`): controlled inputs for `name` (text) and `type` (Select); on submit → `createCategoryAction(input)` → `router.refresh()` on `ok: true`; field error displayed below each input; submit button disabled during pending; form cleared after success
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add CategorySection and CreateCategoryForm components`

---

### T17: `DeleteCategoryDialog` component [P]

**What**: Create the delete confirmation dialog for custom categories with two variants: "em uso" (blocked) and "livre" (requires typing exact text `"excluir permanentemente"`).
**Where**: `src/modules/categories/components/DeleteCategoryDialog.tsx` (create)
**Depends on**: T6, T12
**Reuses**: `Dialog`, `Input`, `Button` from `@/shared`; `Category` type; `deleteCategoryAction`; `CATEGORY_IN_USE_ERROR` from domain constants
**Requirement**: CAT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Accepts props: `open`, `onOpenChange`, `category: Category | null`, `isInUse: boolean`, `onDeleted: () => void`
- [ ] "Em uso" variant: title "Categoria em uso"; message explaining the category has transactions and cannot be deleted; only "Fechar" button
- [ ] "Livre" variant: explicit irreversibility warning (`"Esta ação não pode ser desfeita"`); controlled `<Input>` requiring exact text `"excluir permanentemente"` (case-sensitive); "Excluir" button enabled ONLY when input matches exactly; spinner during pending; on success → `onDeleted()` + `router.refresh()`
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add DeleteCategoryDialog with "em uso" and "livre" variants`

---

### T18: `CategoriesPageClient` component

**What**: Create the coordinating client component for `/app/categories` that manages dialog state and composes `CategorySection`, `CreateCategoryForm`, and `DeleteCategoryDialog`.
**Where**: `src/modules/categories/components/CategoriesPageClient.tsx` (create)
**Depends on**: T16, T17
**Reuses**: `CategorySection`, `CreateCategoryForm`, `DeleteCategoryDialog` (from T16, T17); `Category` type; `isCategoryInUse` — NOTE: this check must be performed server-side; CategoriesPageClient triggers deletion and receives `isInUse` flag from the action response, or calls `deleteCategoryAction` and interprets CATEGORY_IN_USE_ERROR as the "em uso" state
**Requirement**: CAT-02, CAT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Accepts `categories: Category[]` as prop (passed from server component)
- [ ] Manages state: `pendingDelete: Category | null`, `isInUse: boolean`, `dialogOpen: boolean`
- [ ] When user triggers delete on a category: opens `DeleteCategoryDialog`; calls `deleteCategoryAction`; if response is `CATEGORY_IN_USE_ERROR` → sets `isInUse: true` and re-opens dialog in "em uso" variant; if `ok: true` → `router.refresh()` + closes dialog
- [ ] Renders one `CategorySection` per type ("entrada" and "saida") with correct filtered categories
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add CategoriesPageClient coordinating component`

---

### T19: `/app/categories` page + update `categories/index.ts`

**What**: Create the server component page for `/app/categories`; update `categories/index.ts` to export `CategoriesPageClient` (deferred from T12).
**Where**: `src/app/app/categories/page.tsx` (create); `src/modules/categories/index.ts` (modify — add `CategoriesPageClient` export)
**Depends on**: T18, T12
**Reuses**: `auth.api.getSession` from auth module; `listCategoriesByUser`, `CategoriesPageClient` from `@/modules/categories`; `headers()` from `next/headers`; existing `/app` layout (protection inherited automatically)
**Requirement**: CAT-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Page is an `async` server component; calls `auth.api.getSession` (session guaranteed by `/app` layout proxy); calls `listCategoriesByUser(session.user.id)`; renders `<CategoriesPageClient categories={categories} />`
- [ ] `CategoriesPageClient` added to `src/modules/categories/index.ts` exports
- [ ] Route `/app/categories` renders without error (dev server or build)
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add /app/categories page and complete categories index exports`

---

### T20: `Pagination` component [P]

**What**: Create the numbered pagination component used on the transactions page.
**Where**: `src/modules/transactions/components/Pagination.tsx` (create)
**Depends on**: None (uses only Next.js `Link`, no module imports)
**Reuses**: Next.js `<Link>`; Tailwind classes for highlight on current page
**Requirement**: TXN-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Accepts props: `page: number`, `totalPages: number`
- [ ] Renders `[← Anterior] [1] [2] … [N] [Próxima →]` using `<Link href="?page=N">` (server component, no client state needed)
- [ ] Current page highlighted visually (Tailwind class)
- [ ] "Anterior" disabled/hidden on page 1; "Próxima" disabled/hidden on last page
- [ ] Ellipsis `…` shown when `totalPages > 7` (agent discretion on algorithm per design)
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add Pagination component (numbered, Link-based)`

---

### T21: `TransactionList` + `TransactionsEmptyState` components [P]

**What**: Create the transactions list component (with visual distinction for entrada/saída) and the empty state component.
**Where**: `src/modules/transactions/components/TransactionList.tsx` (create); `src/modules/transactions/components/TransactionsEmptyState.tsx` (create)
**Depends on**: T6, T15
**Reuses**: `Transaction` from `@/modules/transactions`; `formatBRL` from `@/shared`; `Button` from `@/shared`; `toLocaleDateString("pt-BR")` for date display
**Requirement**: TXN-06, TXN-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `TransactionList` (`"use client"`): accepts `items: Transaction[]`, `onEdit: (t: Transaction) => void`, `onDelete: (t: Transaction) => void`; renders each row with: date (pt-BR locale), description (`"—"` when null), category name, type badge ("Entrada"/"Saída"), value via `formatBRL`; entrada value shown in green, saída value shown in red (must be visually distinct — never confusable); "Editar" and "Excluir" buttons per row calling respective callbacks
- [ ] `TransactionsEmptyState`: renders "Nenhuma transação registrada" + CTA button "Registrar primeira transação" that calls `onAddNew` prop; never blank/broken
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add TransactionList and TransactionsEmptyState components`

---

### T22: `DeleteTransactionDialog` component [P]

**What**: Create the simple confirmation dialog for deleting a transaction (no typed confirmation required — simpler than category deletion per spec).
**Where**: `src/modules/transactions/components/DeleteTransactionDialog.tsx` (create)
**Depends on**: T6, T15
**Reuses**: `Dialog`, `Button` from `@/shared`; `Transaction` type; `deleteTransactionAction`
**Requirement**: TXN-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Accepts props: `open`, `onOpenChange`, `transaction: Transaction | null`, `onDeleted: () => void`
- [ ] Renders: "Tem certeza que deseja excluir esta transação?" + "Cancelar" and "Excluir" (destructive variant) buttons; spinner during pending; on confirm → `deleteTransactionAction(transaction.id)` → `router.refresh()` → `onDeleted()`; cancel → closes dialog, transaction intact
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add DeleteTransactionDialog component`

---

### T23: `TransactionModal` component

**What**: Create the unified create/edit modal for transactions (Dialog with all form fields; category list filtered by selected type; pre-populated in edit mode).
**Where**: `src/modules/transactions/components/TransactionModal.tsx` (create)
**Depends on**: T6, T12, T15
**Reuses**: `Dialog`, `Select`, `Input`, `Label`, `Button` from `@/shared`; `Category` from `@/modules/categories`; `Transaction`, `createTransactionAction`, `updateTransactionAction` from `@/modules/transactions`; `parseBRL` not used here (conversion happens in action); `router.refresh()` pattern
**Requirement**: TXN-01, TXN-02, TXN-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Accepts props: `categories: Category[]`, `transaction?: Transaction` (undefined = create, defined = edit), `open`, `onOpenChange`, `onSuccess: () => void`
- [ ] Form fields: type (Select — "Entrada"/"Saída"), date (`<input type="date" min="2000-01-01" max="+100 years">`), amount (`<input type="text" inputMode="decimal" placeholder="0,00">`), description (optional text input), category (Select filtered by selected type)
- [ ] When `type` changes → reset `categoryId` (prevents mismatch); category Select re-filtered to `categories.filter(c => c.type === selectedType)`
- [ ] Edit mode: pre-populates all fields from `transaction` prop; dialog title "Editar transação"; calls `updateTransactionAction(transaction.id, formData)`
- [ ] Create mode: blank form; dialog title "Nova transação"; calls `createTransactionAction(formData)`
- [ ] On `ok: true` → `onSuccess()` (parent calls `router.refresh()` + closes modal); on `ok: false` → display field errors inline
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add unified TransactionModal for create and edit`

---

### T24: `TransactionsPageClient` component + update `transactions/index.ts`

**What**: Create the coordinating client component for `/app/transactions` that composes the list, modal, empty state, and dialogs; update `transactions/index.ts` to export it.
**Where**: `src/modules/transactions/components/TransactionsPageClient.tsx` (create); `src/modules/transactions/index.ts` (modify — add `TransactionsPageClient` export)
**Depends on**: T20, T21, T22, T23
**Reuses**: `TransactionModal`, `TransactionList`, `TransactionsEmptyState`, `Pagination`, `DeleteTransactionDialog` from transactions components; `Transaction`, `Category` types; `router.refresh()` pattern
**Requirement**: TXN-06, TXN-07, TXN-09, TXN-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Accepts props: `items: Transaction[]`, `total: number`, `page: number`, `totalPages: number`, `categories: Category[]`
- [ ] Manages state: `modalOpen: boolean`, `editingTransaction: Transaction | null`, `deletingTransaction: Transaction | null`
- [ ] "Nova transação" button opens `TransactionModal` in create mode
- [ ] Row "Editar" → sets `editingTransaction` + opens `TransactionModal` in edit mode
- [ ] Row "Excluir" → sets `deletingTransaction` + opens `DeleteTransactionDialog`
- [ ] `onSuccess` / `onDeleted` → `router.refresh()` + reset state
- [ ] Renders `TransactionList` (or `TransactionsEmptyState` when `items.length === 0`) + `Pagination`
- [ ] `TransactionsPageClient` added to `src/modules/transactions/index.ts` exports
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add TransactionsPageClient and complete transactions index exports`

---

### T25: `/app/transactions` page

**What**: Create the server component page for `/app/transactions` with `searchParams` pagination, page-clamp for out-of-range pages, and Promise.all for parallel data fetching.
**Where**: `src/app/app/transactions/page.tsx` (create)
**Depends on**: T24, T15
**Reuses**: `auth.api.getSession` from auth module; `listTransactions`, `TransactionsPageClient` from `@/modules/transactions`; `listCategoriesByUser` from `@/modules/categories`; `headers()`, `searchParams` async pattern (AD-013: Next.js async searchParams)
**Requirement**: TXN-06, TXN-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `searchParams: Promise<{ page?: string }>` (async per AD-013); `await searchParams`; `parseInt(pageParam ?? "1") || 1` → safe integer
- [ ] Parallel fetch: `Promise.all([listTransactions(userId, requestedPage), listCategoriesByUser(userId)])`
- [ ] Page-clamp: if `requestedPage > txnData.totalPages`, re-fetch with `safePage = Math.max(1, Math.min(requestedPage, txnData.totalPages || 1))`; renders valid state (never 404)
- [ ] Renders `<TransactionsPageClient {...data} categories={categories} />`
- [ ] Route `/app/transactions` renders without error
- [ ] Gate check passes: `pnpm build && pnpm lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add /app/transactions page with pagination clamp and parallel fetch`

---

### T26: E2E `e2e/transactions.spec.ts`

**What**: Implement the E2E test covering the required flow: login → create transaction entrada → create transaction saída → both visible in list with correct type, category, and BRL value.
**Where**: `e2e/transactions.spec.ts` (create)
**Depends on**: T19, T25
**Reuses**: Account creation pattern from `e2e/auth.spec.ts` (`uniqueValidCpf`, `fillSignUpForm`); Playwright `page.goto`, `getByRole`, `getByLabel`, `expect` idioms
**Requirement**: TXN-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Test creates its own fresh user account (no shared state with other E2E tests — AD-011); uses random CPF + email per `auth.spec.ts` pattern
- [ ] Flow: login → navigate to `/app/transactions` → open modal → create entrada "Salário" category, R$ 5.000,00 → visible in list with type "Entrada" badge, "Salário" category, "R$ 5.000,00" value → open modal again → create saída "Alimentação" category, R$ 250,37 → both transactions visible in list with distinct visual treatment (entrada in green / saída in red or equivalent distinction)
- [ ] Assertions: both transactions appear in the list; descriptions, categories and values match; type badges are distinct and correct
- [ ] Gate check passes: `pnpm test:e2e`
- [ ] Test count: 1+ E2E test passes (spec-level isolation confirmed)

**Tests**: e2e
**Gate**: E2E

**Commit**: `test(transactions): add E2E spec covering create entrada + saída and list visibility`

---

## Parallel Execution Map

```
Phase 1 (Sequential — database schema):
  T1 ──→ T2

Phase 2 (Parallel + Sequential — domain, shared, seed):
  (no dep) ──┬── T3 [P]
             ├── T4 [P]   } All four start immediately (no dependencies)
             ├── T5 [P]
             └── T6 [P]
  T2 ──────────── T7      (seed waits for migration)
  Phase 2 done when T3, T4, T5, T6, T7 all complete

Phase 3 (Sequential — data layers; integration tests not parallel-safe):
  T8 ──→ T9

Phase 4 (Sequential — actions + module APIs; integration tests not parallel-safe):
  T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14 ──→ T15

Phase 5 (Parallel + Sequential — components, pages, E2E):
  T16 [P] ──┐
             ├──→ T18 ──→ T19 ──┐
  T17 [P] ──┘                   │
                                 ├──→ T26
  T20 [P] ──────────────┐        │
  T21 [P] ──────────────┤        │
  T22 [P] ──────────────┼──→ T24 ──→ T25 ──┘
  T23     ──────────────┘
```

**Parallelism constraint:** Tasks marked `[P]` have no inter-task dependency and can be executed in any order within their phase. `[P]` does NOT spawn a sub-agent per task — it is ordering information for the phase worker (or the main agent) executing the phase. Integration test tasks are never `[P]` because `fileParallelism: false` prevents concurrent test file execution.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Prisma schema | 1 file, 2 models + 1 model update | ✅ Granular (cohesive — schema is one artifact) |
| T2: Migration | 1 migration file + 2 SQL statements | ✅ Granular (one migration = one atomic DB change) |
| T3: parseBRL | 1 function in 1 file + test additions | ✅ Granular |
| T4: Categories domain | 3 files (types, schemas, constants) in `domain/` | ✅ Granular (2–3 related files, cohesive domain layer) |
| T5: Transactions domain | 3 files in `domain/` | ✅ Granular (same rationale as T4) |
| T6: shadcn additions | 3 new UI files + 1 index update | ✅ Granular (single install command + re-exports) |
| T7: Seed + global-setup | 3 files (seed.ts, package.json, global-setup.ts) + tests | ✅ Granular (cohesive: one concern — seed lifecycle) |
| T8: categories-repository | 1 file + integration tests | ✅ Granular |
| T9: transactions-repository | 1 file + integration tests | ✅ Granular |
| T10: create-category action | 2 files (core + wrapper) + integration tests | ✅ Granular (core + wrapper = 1 action unit per project convention) |
| T11: delete-category action | 2 files + integration tests | ✅ Granular |
| T12: categories/index.ts | 1 file (modify placeholder) | ✅ Granular |
| T13: create-transaction action | 2 files + integration tests | ✅ Granular |
| T14: update + delete transaction actions | 4 files + integration tests | ✅ Granular (both in `txn-mutations.integration.test.ts` per design — cohesive) |
| T15: transactions/index.ts | 1 file (modify placeholder) | ✅ Granular |
| T16: CategorySection + CreateCategoryForm | 2 files, same categories page context | ✅ Granular (2 related components, cohesive — always rendered together) |
| T17: DeleteCategoryDialog | 1 component file | ✅ Granular |
| T18: CategoriesPageClient | 1 component file | ✅ Granular |
| T19: categories page + index update | 1 page + 1 index line | ✅ Granular (page + completing its module's public API) |
| T20: Pagination | 1 component file | ✅ Granular |
| T21: TransactionList + EmptyState | 2 files, always rendered as a unit | ✅ Granular (2 related components, cohesive) |
| T22: DeleteTransactionDialog | 1 component file | ✅ Granular |
| T23: TransactionModal | 1 component file | ✅ Granular |
| T24: TransactionsPageClient + index update | 1 component + 1 index line | ✅ Granular |
| T25: transactions page | 1 file | ✅ Granular |
| T26: E2E spec | 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | Phase 1 start | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | (no dep) parallel | ✅ Match |
| T4 | None | (no dep) parallel | ✅ Match |
| T5 | None | (no dep) parallel | ✅ Match |
| T6 | None | (no dep) parallel | ✅ Match |
| T7 | T2 | T2 → T7 | ✅ Match |
| T8 | T2, T4, T7 | Phase 3 start (after Phase 1+2) | ✅ Match |
| T9 | T2, T5, T7, T8 | T8 → T9 | ✅ Match |
| T10 | T4, T8 | Phase 4 start | ✅ Match |
| T11 | T4, T8, T10 | T10 → T11 | ✅ Match |
| T12 | T10, T11 | T11 → T12 | ✅ Match |
| T13 | T3, T5, T9, T11, T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T13, T14 | T14 → T15 | ✅ Match |
| T16 | T6, T12 | Phase 5 parallel start | ✅ Match |
| T17 | T6, T12 | Phase 5 parallel start | ✅ Match |
| T18 | T16, T17 | T16 + T17 → T18 | ✅ Match |
| T19 | T18, T12 | T18 → T19 | ✅ Match |
| T20 | None | Phase 5 parallel start | ✅ Match |
| T21 | T6, T15 | Phase 5 parallel (after T15) | ✅ Match |
| T22 | T6, T15 | Phase 5 parallel (after T15) | ✅ Match |
| T23 | T6, T12, T15 | Phase 5 (after T12 + T15) | ✅ Match |
| T24 | T20, T21, T22, T23 | T20+T21+T22+T23 → T24 | ✅ Match |
| T25 | T24, T15 | T24 → T25 | ✅ Match |
| T26 | T19, T25 | T19 + T25 → T26 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Prisma schema | Prisma schema / migration | none | none → build | ✅ OK |
| T2: Migration | Prisma migration | none | none → build | ✅ OK |
| T3: parseBRL | Shared utility function | unit | unit | ✅ OK |
| T4: Categories domain | Domain schemas / types | unit | unit | ✅ OK |
| T5: Transactions domain | Domain schemas / types | unit | unit | ✅ OK |
| T6: shadcn additions | UI component config | none | none → build | ✅ OK |
| T7: Seed + global-setup | Seed / DB setup | integration | integration | ✅ OK |
| T8: categories-repository | Data layer / repository | integration | integration | ✅ OK |
| T9: transactions-repository | Data layer / repository | integration | integration | ✅ OK |
| T10: create-category action | Actions (core logic) | integration | integration | ✅ OK |
| T11: delete-category action | Actions (core logic) | integration | integration | ✅ OK |
| T12: categories/index.ts | Module API re-export (no logic) | none | none → build | ✅ OK |
| T13: create-transaction action | Actions (core logic) | integration | integration | ✅ OK |
| T14: update + delete actions | Actions (core logic) | integration | integration | ✅ OK |
| T15: transactions/index.ts | Module API re-export (no logic) | none | none → build | ✅ OK |
| T16: CategorySection + CreateCategoryForm | React components | none | none → build | ✅ OK |
| T17: DeleteCategoryDialog | React component | none | none → build | ✅ OK |
| T18: CategoriesPageClient | React component | none | none → build | ✅ OK |
| T19: categories page | Server component / App Router page | none | none → build | ✅ OK |
| T20: Pagination | React component | none | none → build | ✅ OK |
| T21: TransactionList + EmptyState | React components | none | none → build | ✅ OK |
| T22: DeleteTransactionDialog | React component | none | none → build | ✅ OK |
| T23: TransactionModal | React component | none | none → build | ✅ OK |
| T24: TransactionsPageClient | React component | none | none → build | ✅ OK |
| T25: transactions page | Server component / App Router page | none | none → build | ✅ OK |
| T26: E2E spec | E2E user flow | e2e | e2e | ✅ OK |

All 26 tasks pass co-location validation. No ❌ violations.

---

## Requirement Traceability (updated from spec.md)

| Requirement ID | Tasks |
| -------------- | ----- |
| CAT-01 | T1, T7 |
| CAT-02 | T7, T16, T18, T19 |
| CAT-03 | T4, T10, T16 |
| CAT-04 | T1, T2, T8, T10 |
| CAT-05 | T4, T10 |
| CAT-06 | T8, T10 |
| CAT-07 | T2, T8, T11, T17 |
| TXN-01 | T5, T23, T25 |
| TXN-02 | T13, T23 |
| TXN-03 | T9, T13 |
| TXN-04 | T3, T5, T13 |
| TXN-05 | T5, T13 |
| TXN-06 | T9, T21, T25 |
| TXN-07 | T9, T20, T21, T25 |
| TXN-08 | T9, T13 |
| TXN-09 | T9, T14, T22 |
| TXN-10 | T9, T14, T23 |
| TXN-11 | T26 |
