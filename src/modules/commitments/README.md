# Módulo `commitments`

## Responsabilidade

Compras parceladas e dívidas/financiamentos de longo prazo: cada compromisso gera um registro pai + N parcelas materializadas (AD-009), com vencimento e status (prevista | paga) próprios.

## API pública

- **Domain**: tipos `Commitment`, `Installment`, `CommitmentMode`, `InstallmentStatus`, `CommitmentProgress`, `CreateCommitmentInput`, `UpdateCommitmentInput`, `SetInstallmentStatusInput`, `EditScope` (`domain/types.ts`).
- **Data**: `listCommitmentsByUser`, `getCommitmentForUser`, `sumInstallmentsByMonth` — queries do repositório, escopadas por `userId` (AD-012); a terceira é consumida por `projections` (AD-016).
- **Actions**: `createCommitmentAction`, `setInstallmentStatusAction`, `updateCommitmentAction`, `deleteCommitmentAction`.
- **Components**: `CommitmentsPageClient` — UI consumida pela rota `/app/commitments`.

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: `shared`, `auth`, `categories` (via seus respectivos `index.ts`).
- **É importável por**: `projections`, e por `src/app` (camada de composição), sempre através deste `index.ts`.
- Import de arquivos internos deste módulo (`domain/`, `data/`, `services/`, `actions/`, `components/`) por qualquer código fora dele é uma violação de fronteira.
