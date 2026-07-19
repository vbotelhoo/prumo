import { headers } from "next/headers";

import { auth } from "@/modules/auth";
import { listCategoriesByUser } from "@/modules/categories";
import { listTransactions, TransactionsPageClient } from "@/modules/transactions";

type SearchParams = Promise<{ page?: string }>;

/**
 * /app/transactions page — server component with pagination.
 * Fetches transactions and categories in parallel.
 * Page-clamps out-of-range page numbers.
 */
export default async function TransactionsPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized: user not found in session");
  }

  // Parse page parameter with safety
  const requestedPage = parseInt(searchParams.page ?? "1") || 1;
  const safePage = Math.max(1, requestedPage); // Ensure page is at least 1

  // Fetch transactions and categories in parallel
  const [txnData, categories] = await Promise.all([
    listTransactions(userId, safePage),
    listCategoriesByUser(userId),
  ]);

  // Page-clamp: if requested page is out of range, re-fetch with clamped page
  let finalTxnData = txnData;
  if (safePage > txnData.totalPages && txnData.totalPages > 0) {
    const clampedPage = Math.min(safePage, txnData.totalPages);
    finalTxnData = await listTransactions(userId, clampedPage);
  }

  return (
    <TransactionsPageClient
      items={finalTxnData.items}
      total={finalTxnData.total}
      page={finalTxnData.page}
      totalPages={finalTxnData.totalPages}
      categories={categories}
    />
  );
}
