import { Card, CardContent, CardHeader, Skeleton } from "@/shared";

// Skeleton de /app/commitments (POLISH-01): aproxima CommitmentsPageClient
// — cabeçalho (título + botão "+ Novo Compromisso") e a lista de cards de
// compromisso, cada um com título, categoria e barra de progresso de
// quitação.
export default function CommitmentsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-44" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
