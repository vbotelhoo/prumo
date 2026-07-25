import { Card, CardContent, Skeleton } from "@/shared";

// Skeleton de /app/projections (POLISH-01): aproxima a página real —
// PageHeader (título + descrição), MonthNavigator (botões prev/next +
// rótulo do mês) e ProjectionSummary (grid de 4 stats), na mesma ordem em
// que a página real renderiza.
export default function ProjectionsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="p-4">
            <CardContent className="flex flex-col gap-2 p-0">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
