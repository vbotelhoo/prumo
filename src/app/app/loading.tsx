import { Card, CardContent, Skeleton } from "@/shared";

// Skeleton do dashboard (POLISH-01): aproxima a forma real de
// src/app/app/page.tsx pós-T9 — herói (saudação + rótulo + saldo Display) ao
// lado dos atalhos de criação (DashboardHero + QuickActions), grid de 3
// StatCards (entradas/saídas/comprometido) e grid de 2 cards (gráfico de
// gastos por categoria + próximos vencimentos) — para minimizar layout
// shift perceptível enquanto os dados carregam no servidor.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-56" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="p-4">
            <CardContent className="flex flex-col gap-2 p-0">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-4">
          <CardContent className="flex flex-col gap-4 p-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-64 w-full rounded-full" />
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardContent className="flex flex-col gap-3 p-0">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
