import { headers } from "next/headers";

import { auth } from "@/modules/auth";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/shared";
import { getMonthlyProjection, getCurrentMonth, formatMonthLabel } from "@/modules/projections";
import { getMonthlyExpensesByCategory } from "@/modules/transactions";
import {
  getMonthlyInstallmentsByCategory,
  listUnpaidInstallmentsForMonth,
} from "@/modules/commitments";
import { listCategoriesByUser } from "@/modules/categories";
import { mergeCategorySpending } from "./_lib/merge-category-spending";
import { DashboardHero } from "./_components/DashboardHero";
import { QuickActions } from "./_components/QuickActions";
import { CategorySpendingChart } from "./_components/CategorySpendingChart";
import { UpcomingInstallmentsList } from "./_components/UpcomingInstallmentsList";

/**
 * /app — dashboard do mês atual (composição em app/, sem módulo de domínio
 * próprio — AD-016). Sem searchParams: dashboard é sempre "hoje"; navegação
 * por mês já existe em /app/projections.
 *
 * Herói-primeiro (POLISH-05..10, spec.md P1 Dashboard): o saldo projetado é
 * o único número Display do viewport (`DashboardHero`); os atalhos de
 * criação (`QuickActions`) substituem os antigos 4 botões de navegação por
 * emoji; os 3 `StatCard` resumem entradas/saídas/comprometido (comprometido
 * em tone `saida` — DESIGN.md trata "comprometido" como semântica de saída,
 * nunca azul); gráfico e lista de vencimentos seguem o padrão de card do
 * DESIGN.md.
 */
export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized: user not found in session");
  }

  const name = session.user.name;
  const month = getCurrentMonth();

  const [projection, expensesByCategory, installmentsByCategory, upcomingInstallments, categories] =
    await Promise.all([
      getMonthlyProjection(userId, month),
      getMonthlyExpensesByCategory(userId, month),
      getMonthlyInstallmentsByCategory(userId, month),
      listUnpaidInstallmentsForMonth(userId, month),
      listCategoriesByUser(userId),
    ]);

  const categorySpending = mergeCategorySpending(expensesByCategory, installmentsByCategory);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <DashboardHero
          userName={name}
          month={formatMonthLabel(month)}
          saldoProjetado={projection.saldoProjetado}
        />
        <QuickActions categories={categories} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Entradas previstas" value={projection.entradasPrevistas} tone="entrada" />
        <StatCard label="Saídas previstas" value={projection.saidasPrevistas} tone="saida" />
        <StatCard label="Total comprometido" value={projection.totalComprometido} tone="saida" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategorySpendingChart data={categorySpending} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingInstallmentsList installments={upcomingInstallments} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
