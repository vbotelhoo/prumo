import { Card, CardContent, Skeleton } from "@/shared";

// Skeleton do dashboard (POLISH-01): aproxima a forma real de
// src/app/app/page.tsx — saudação centralizada, grid de 4 stats
// (ProjectionSummary), grid de 2 cards (gráfico + próximos vencimentos) e a
// grade de 4 atalhos de navegação — para minimizar layout shift perceptível
// enquanto os dados carregam no servidor.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="p-4">
              <CardContent className="flex flex-col gap-2 p-0">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
