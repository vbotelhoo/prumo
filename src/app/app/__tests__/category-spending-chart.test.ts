import { describe, expect, it } from "vitest";

import { money } from "@/shared";
import { assignCategoryChartColors } from "../_components/CategorySpendingChart";
import type { CategorySpendingSlice } from "../_lib/merge-category-spending";

// spec.md Edge Cases: "gráfico de gastos com 1 única categoria ou muitas
// (>8) permanece legível (sem legenda ilegível nem cores repetidas
// indistinguíveis)". `CategorySpendingChart` (Recharts + `ResponsiveContainer`)
// não renderiza filhos em jsdom sem mockar `ResizeObserver` — a lógica de
// atribuição de cor é pura e foi extraída (`assignCategoryChartColors`)
// exatamente para ser testável sem essa dependência frágil de DOM/canvas.
function slice(categoryId: string, categoryName: string): CategorySpendingSlice {
  return { categoryId, categoryName, total: money(1000) };
}

describe("assignCategoryChartColors", () => {
  it("1 única categoria: renderiza com a primeira cor do token, sem erro", () => {
    const result = assignCategoryChartColors([slice("c1", "Mercado")]);

    expect(result).toHaveLength(1);
    expect(result[0]!.fill).toBe("var(--chart-1)");
  });

  it("até 8 categorias: cada uma recebe um token distinto (--chart-1..8), sem repetição", () => {
    const data = Array.from({ length: 8 }, (_, i) => slice(`c${i}`, `Categoria ${i}`));

    const result = assignCategoryChartColors(data);

    const fills = result.map((r) => r.fill);
    expect(new Set(fills).size).toBe(8);
    expect(fills).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
      "var(--chart-6)",
      "var(--chart-7)",
      "var(--chart-8)",
    ]);
  });

  it(">8 categorias: cicla os 8 tokens em vez de quebrar ou gerar cor indefinida", () => {
    const data = Array.from({ length: 11 }, (_, i) => slice(`c${i}`, `Categoria ${i}`));

    const result = assignCategoryChartColors(data);

    expect(result).toHaveLength(11);
    // 9ª (índice 8) e 10ª (índice 9) categorias reciclam --chart-1/--chart-2
    expect(result[8]!.fill).toBe("var(--chart-1)");
    expect(result[9]!.fill).toBe("var(--chart-2)");
    // Nenhuma categoria fica sem cor (todas dentro dos 8 tokens válidos)
    for (const item of result) {
      expect(item.fill).toMatch(/^var\(--chart-[1-8]\)$/);
    }
  });
});
