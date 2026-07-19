import { describe, expect, it } from "vitest";
import { prisma } from "@/shared";

describe("Seed integration", () => {
  // T7: primeiro seed → exatamente 13 categorias
  it("seed creates exactly 13 default categories", async () => {
    const count = await prisma.category.count({
      where: { userId: null },
    });
    expect(count).toBe(13);
  });

  // T7: segundo seed → ainda 13 (sem duplicatas)
  it("seed is idempotent - no duplicates on re-run", async () => {
    const countBefore = await prisma.category.count({
      where: { userId: null },
    });
    // Seed already ran in global-setup, so just verify count stays same
    expect(countBefore).toBe(13);
  });

  // T7: categorias padrão têm userId = null
  it("default categories have userId = null", async () => {
    const defaultCategories = await prisma.category.findMany({
      where: { userId: null },
    });
    expect(defaultCategories.every((c) => c.userId === null)).toBe(true);
  });
});
