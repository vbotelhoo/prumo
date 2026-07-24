import { describe, expect, it } from "vitest";
import { LANDING_NAV_SECTIONS } from "../nav";

describe("LANDING_NAV_SECTIONS", () => {
  // LAND-10: âncoras da landing com IDs, labels e hrefs corretos
  it("exporta as 3 seções de valor com ids únicos e labels pt-BR", () => {
    expect(LANDING_NAV_SECTIONS).toHaveLength(3);
    expect(LANDING_NAV_SECTIONS.map((item) => [item.id, item.label])).toEqual([
      ["previsibilidade", "Previsibilidade"],
      ["parcelas", "Parcelas e Financiamentos"],
      ["projecao", "Projeção Mensal"],
    ]);
  });

  it("todos os IDs são únicos", () => {
    const ids = LANDING_NAV_SECTIONS.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("todos os labels são strings não-vazias", () => {
    expect(LANDING_NAV_SECTIONS.every((item) => typeof item.label === "string" && item.label.length > 0)).toBe(true);
  });

  it("href derivado é /#id para cada seção", () => {
    LANDING_NAV_SECTIONS.forEach((item) => {
      expect(item.href).toBe(`/#${item.id}`);
    });
  });
});
