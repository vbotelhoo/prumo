import { Skeleton } from "@/shared";

// Skeleton de /app/categories (POLISH-01): aproxima CategoriesPageClient —
// formulário de criação, título de página e as 2 seções (Entradas/Saídas)
// com suas listas de categorias.
export default function CategoriesLoading() {
  return (
    <div className="flex-1 px-6 py-8">
      <div className="max-w-4xl space-y-8">
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div>
          <Skeleton className="mb-6 h-8 w-32" />
          <div className="space-y-6">
            {Array.from({ length: 2 }, (_, section) => (
              <div key={section} className="space-y-3 border-b pb-6 last:border-b-0">
                <Skeleton className="h-5 w-24" />
                {Array.from({ length: 3 }, (_, row) => (
                  <Skeleton key={row} className="h-8 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
