"use client";

import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL, money } from "@/shared";
import type { CategorySpendingSlice } from "../_lib/merge-category-spending";

// Paleta categórica validada (dataviz skill: fixed hue anchors, CVD-safe em
// ordem fixa). Ciclada por índice pós-ordenação — mesma categoria mantém a
// mesma cor dentro de um render, mesmo com mais de 8 categorias.
const CATEGORY_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

interface ChartDatum extends CategorySpendingSlice {
  fill: string;
}

export function CategorySpendingChart({ data }: { readonly data: CategorySpendingSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">
        Nenhum gasto neste mês
      </div>
    );
  }

  const chartData: ChartDatum[] = data.map((slice, index) => ({
    ...slice,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length]!,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={chartData} dataKey="total" nameKey="categoryName" innerRadius={60} outerRadius={100} paddingAngle={2} />
        <Tooltip formatter={(value) => formatBRL(money(Number(value)))} />
        <Legend
          formatter={(_value, entry) => {
            const slice = entry.payload as unknown as ChartDatum;
            return `${slice.categoryName} — ${formatBRL(slice.total)}`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
