import { Skeleton } from "@/shared";

// Skeleton de /app/transactions (POLISH-01): aproxima
// TransactionsPageClient — cabeçalho (título + botão "+ Nova transação"),
// lista de linhas (data/badge à esquerda, valor à direita) e paginação.
export default function TransactionsLoading() {
  return (
    <div className="flex-1 px-6 py-8">
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>

        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
