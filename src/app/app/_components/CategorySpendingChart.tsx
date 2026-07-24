"use client";

import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState, formatBRL, money } from "@/shared";
import type { CategorySpendingSlice } from "../_lib/merge-category-spending";

// Paleta categórica validada (dataviz skill: fixed hue anchors, CVD-safe em
// ordem fixa) — AD-018: cores do gráfico só via tokens `--chart-1..8` de
// globals.css, nunca hex hardcoded. Ciclada por índice pós-ordenação; mesma
// categoria mantém a mesma cor dentro de um render, mesmo com mais de 8
// categorias.
const CATEGORY_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

interface ChartDatum extends CategorySpendingSlice {
  fill: string;
}

export function CategorySpendingChart({ data }: { readonly data: CategorySpendingSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <EmptyState title="Nenhum gasto neste mês" />
      </div>
    );
  }

  const chartData: ChartDatum[] = data.map((slice, index) => ({
    ...slice,
    fill: CATEGORY_COLOR_VARS[index % CATEGORY_COLOR_VARS.length]!,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={chartData} dataKey="total" nameKey="categoryName" innerRadius={60} outerRadius={100} paddingAngle={2} />
        <Tooltip
          formatter={(value) => formatBRL(money(Number(value)))}
          contentStyle={{
            backgroundColor: "var(--popover)",
            borderColor: "var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
          }}
          labelStyle={{ color: "var(--popover-foreground)" }}
          itemStyle={{ color: "var(--popover-foreground)" }}
        />
        <Legend
          formatter={(_value, entry) => {
            const slice = entry.payload as unknown as ChartDatum;
            return `${slice.categoryName} — ${formatBRL(slice.total)}`;
          }}
          wrapperStyle={{ color: "var(--foreground)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
