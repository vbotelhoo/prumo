import { headers } from "next/headers";

import { auth } from "@/modules/auth";
import { PageHeader } from "@/shared";
import {
  getMonthlyProjection,
  parseMonthParam,
  ProjectionSummary,
  MonthNavigator,
} from "@/modules/projections";

type SearchParams = Promise<{ month?: string }>;

/**
 * /app/projections page — monthly projection with navigation.
 * Server component; month is URL param (?month=YYYY-MM), defaults to current.
 */
export default async function ProjectionsPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized: user not found in session");
  }

  // Parse month parameter; invalid or absent → current month (UTC)
  const month = parseMonthParam(searchParams.month);

  // Fetch projection for this month
  const projection = await getMonthlyProjection(userId, month);

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 py-8">
      <PageHeader title="Projeções" description="Planejamento do mês selecionado." />
      <MonthNavigator month={month} />
      <ProjectionSummary projection={projection} />
    </div>
  );
}
