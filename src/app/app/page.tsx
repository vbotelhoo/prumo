import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/modules/auth";
import { Button, Card } from "@/shared";
import { getMonthlyProjection, getCurrentMonth, ProjectionSummary } from "@/modules/projections";
import { getMonthlyExpensesByCategory } from "@/modules/transactions";
import {
  getMonthlyInstallmentsByCategory,
  listUnpaidInstallmentsForMonth,
} from "@/modules/commitments";
import { mergeCategorySpending } from "./_lib/merge-category-spending";
import { CategorySpendingChart } from "./_components/CategorySpendingChart";
import { UpcomingInstallmentsList } from "./_components/UpcomingInstallmentsList";

/**
 * /app — dashboard do mês atual (composição em app/, sem módulo de domínio
 * próprio — AD-016). Sem searchParams: dashboard é sempre "hoje"; navegação
 * por mês já existe em /app/projections.
 */
export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized: user not found in session");
  }

  const name = session.user.name;
  const month = getCurrentMonth();

  const [projection, expensesByCategory, installmentsByCategory, upcomingInstallments] =
    await Promise.all([
      getMonthlyProjection(userId, month),
      getMonthlyExpensesByCategory(userId, month),
      getMonthlyInstallmentsByCategory(userId, month),
      listUnpaidInstallmentsForMonth(userId, month),
    ]);

  const categorySpending = mergeCategorySpending(expensesByCategory, installmentsByCategory);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <div className="text-center">
          <p className="text-2xl">
            Olá, <span className="font-semibold">{name}</span>!
          </p>
          <p className="text-gray-500 mt-2">Bem-vindo ao Prumo</p>
        </div>

        <ProjectionSummary projection={projection} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Gastos por categoria</h2>
            <CategorySpendingChart data={categorySpending} />
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Próximos vencimentos</h2>
            <UpcomingInstallmentsList installments={upcomingInstallments} />
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/app/transactions" className="block">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">💰</span>
              <span>Transações</span>
            </Button>
          </Link>
          <Link href="/app/commitments" className="block">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">📋</span>
              <span>Compromissos</span>
            </Button>
          </Link>
          <Link href="/app/categories" className="block">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">🏷️</span>
              <span>Categorias</span>
            </Button>
          </Link>
          <Link href="/app/projections" className="block">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">📈</span>
              <span>Projeções</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
