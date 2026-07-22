import { describe, it, expect } from "vitest";
import { money } from "@/shared";
import { mergeCategorySpending } from "../merge-category-spending";

describe("mergeCategorySpending", () => {
  it("returns empty array when both inputs are empty", () => {
    const result = mergeCategorySpending([], []);

    expect(result).toEqual([]);
  });

  it("includes a category that only has transaction spending", () => {
    const result = mergeCategorySpending(
      [{ categoryId: "cat-1", categoryName: "Alimentação", total: money(5000) }],
      []
    );

    expect(result).toEqual([
      { categoryId: "cat-1", categoryName: "Alimentação", total: money(5000) },
    ]);
  });

  it("includes a category that only has commitment (installment) spending", () => {
    const result = mergeCategorySpending(
      [],
      [{ categoryId: "cat-1", categoryName: "Eletrônicos", total: money(15000) }]
    );

    expect(result).toEqual([
      { categoryId: "cat-1", categoryName: "Eletrônicos", total: money(15000) },
    ]);
  });

  it("sums transaction and commitment totals for the same categoryId (DASH-07)", () => {
    const result = mergeCategorySpending(
      [{ categoryId: "cat-1", categoryName: "Eletrônicos", total: money(3000) }],
      [{ categoryId: "cat-1", categoryName: "Eletrônicos", total: money(15000) }]
    );

    expect(result).toEqual([
      { categoryId: "cat-1", categoryName: "Eletrônicos", total: money(18000) },
    ]);
  });

  it("keeps two categories with the same name but different categoryId separate (DASH-18)", () => {
    const result = mergeCategorySpending(
      [
        { categoryId: "cat-default", categoryName: "Outros", total: money(1000) },
        { categoryId: "cat-custom", categoryName: "Outros", total: money(2000) },
      ],
      []
    );

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { categoryId: "cat-default", categoryName: "Outros", total: money(1000) },
        { categoryId: "cat-custom", categoryName: "Outros", total: money(2000) },
      ])
    );
  });

  it("orders the result by total descending", () => {
    const result = mergeCategorySpending(
      [
        { categoryId: "cat-low", categoryName: "Lazer", total: money(1000) },
        { categoryId: "cat-high", categoryName: "Moradia", total: money(50000) },
      ],
      [{ categoryId: "cat-mid", categoryName: "Transporte", total: money(10000) }]
    );

    expect(result.map((slice) => slice.categoryId)).toEqual(["cat-high", "cat-mid", "cat-low"]);
  });
});
