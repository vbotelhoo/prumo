import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isActive } from "../nav";

describe("NAV_ITEMS", () => {
  // SHELL-01: ordem e conteúdo exatos dos 5 links da sidebar.
  it("lista as 5 seções na ordem da spec", () => {
    expect(NAV_ITEMS.map((item) => [item.label, item.href])).toEqual([
      ["Dashboard", "/app"],
      ["Transações", "/app/transactions"],
      ["Compromissos", "/app/commitments"],
      ["Categorias", "/app/categories"],
      ["Projeções", "/app/projections"],
    ]);
  });

  it("marca só o Dashboard como match exato (demais seções casam por prefixo)", () => {
    const [dashboard, ...sections] = NAV_ITEMS;
    expect(dashboard!.exact).toBe(true);
    expect(sections.every((item) => item.exact === false)).toBe(true);
  });
});

describe("isActive", () => {
  // SHELL-03: para cada rota real da spec, exatamente um item ativo.
  it.each([
    ["/app", "Dashboard"],
    ["/app/transactions", "Transações"],
    ["/app/commitments", "Compromissos"],
    ["/app/categories", "Categorias"],
    ["/app/projections", "Projeções"],
  ])("em %s, só '%s' fica ativo", (pathname, expectedActiveLabel) => {
    const activeItems = NAV_ITEMS.filter((item) => isActive(pathname, item));
    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]!.label).toBe(expectedActiveLabel);
  });

  // Edge case (spec.md): sub-rota futura mantém a seção dona ativa.
  it("sub-rota (/app/commitments/123) mantém 'Compromissos' ativo", () => {
    const commitments = NAV_ITEMS.find((item) => item.label === "Compromissos")!;
    expect(isActive("/app/commitments/123", commitments)).toBe(true);
  });

  // Edge case: match exato do Dashboard não vaza para outras rotas /app/*.
  it("'/app' exato não ativa o Dashboard em nenhuma outra rota", () => {
    const dashboard = NAV_ITEMS.find((item) => item.label === "Dashboard")!;
    expect(isActive("/app/transactions", dashboard)).toBe(false);
    expect(isActive("/app/commitments", dashboard)).toBe(false);
  });

  // Edge case: prefixo textual sem fronteira de segmento não é a mesma rota.
  it("rota com prefixo textual mas sem fronteira de segmento não ativa a seção", () => {
    const commitments = NAV_ITEMS.find((item) => item.label === "Compromissos")!;
    expect(isActive("/app/commitments-extra", commitments)).toBe(false);
  });

  // Nunca dois itens ativos ao mesmo tempo, mesmo em sub-rotas.
  it("nunca há dois itens ativos simultaneamente em uma sub-rota", () => {
    const activeItems = NAV_ITEMS.filter((item) => isActive("/app/projections/2026-08", item));
    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]!.label).toBe("Projeções");
  });
});
