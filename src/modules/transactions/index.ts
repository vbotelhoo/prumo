// API pública do módulo `transactions`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste módulo. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).

// Domain: tipos e schemas
export type { Transaction, TransactionInput } from "./domain/types";

// Data layer: repository queries
export { listTransactions, getMonthlyTransactionTotals } from "./data/transactions-repository";

// Actions: mutations
export { createTransactionAction } from "./actions/create-transaction-action";
export { updateTransactionAction } from "./actions/update-transaction-action";
export { deleteTransactionAction } from "./actions/delete-transaction-action";

// Components
export { TransactionsPageClient } from "./components/TransactionsPageClient";
