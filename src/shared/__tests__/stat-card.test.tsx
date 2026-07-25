// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { StatCard } from "../components/ui/stat-card";
import { formatBRL, money } from "../money";

// spec.md POLISH-11 (Número Alinhado — tabular-nums), POLISH-13 (Semântica
// Só em Número — tone `saida` usa a cor semântica de saída, nunca azul).
//
// Nota: `formatBRL` usa um espaço não separável (U+00A0, ver money.test.ts)
// entre "R$" e o valor; o normalizador padrão do RTL colapsa \s (que inclui
// U+00A0) em espaço comum ao comparar texto, então `getByText` com a string
// crua de `formatBRL` como matcher falha por divergência de espaço. Os
// testes abaixo desabilitam a normalização (`normalizer: (t) => t`) para
// comparar o texto exatamente como `formatBRL` produz.
afterEach(() => cleanup());

function getValueByExactText(text: string) {
  return screen.getByText(text, { normalizer: (t) => t });
}

describe("StatCard", () => {
  it("tone neutral: valor em texto primário (foreground), sem cor semântica", () => {
    render(<StatCard label="Saldo" value={money(150000)} tone="neutral" />);

    const value = getValueByExactText(formatBRL(money(150000)));
    expect(value.className).toContain("text-foreground");
    expect(value.className).not.toContain("text-positive");
    expect(value.className).not.toContain("text-negative");
  });

  it("tone entrada: valor na cor semântica de Entrada", () => {
    render(<StatCard label="Entradas" value={money(50000)} tone="entrada" />);

    const value = getValueByExactText(formatBRL(money(50000)));
    expect(value.className).toContain("text-positive");
  });

  it("tone saida: valor na cor semântica de Saída (nunca azul)", () => {
    render(<StatCard label="Saídas" value={money(30000)} tone="saida" />);

    const value = getValueByExactText(formatBRL(money(30000)));
    expect(value.className).toContain("text-negative");
    expect(value.className).not.toMatch(/text-blue-\d+/);
  });

  it("formata o valor exclusivamente via formatBRL (AD-008) e usa tabular-nums", () => {
    const expected = formatBRL(money(123456));
    render(<StatCard label="Total Comprometido" value={money(123456)} tone="saida" />);

    const value = getValueByExactText(expected);
    expect(value.textContent).toBe(expected);
    expect(value.className).toContain("tabular-nums");
  });

  it("renderiza o label", () => {
    render(<StatCard label="Saldo projetado" value={money(0)} />);

    expect(screen.getByText("Saldo projetado")).toBeDefined();
  });
});
