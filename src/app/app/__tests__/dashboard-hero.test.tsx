// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { formatBRL, money } from "@/shared";
import { DashboardHero } from "../_components/DashboardHero";

// Testa AC1/AC2 (spec.md, P1 Dashboard) e o edge case do sinal negativo:
// - AC1: saldo é o único número Display do viewport, tabular, saudação
//   reduzida a papel secundário.
// - AC2: cor semântica no negativo (Saída) vs. positivo (texto primário).
afterEach(() => cleanup());

describe("DashboardHero", () => {
  it("branch positivo: exibe o saldo formatado com a cor de texto primária, não negativa", () => {
    render(<DashboardHero userName="Maria" month="Julho 2026" saldoProjetado={money(150_000)} />);

    const saldo = screen.getByTestId("dashboard-hero-saldo");
    expect(saldo.textContent).toBe(formatBRL(money(150_000)));
    expect(saldo.className).toContain("text-foreground");
    expect(saldo.className).not.toContain("text-negative");
  });

  it("branch negativo: exibe o saldo com sinal negativo e a cor semântica de Saída/negativo", () => {
    render(<DashboardHero userName="Maria" month="Julho 2026" saldoProjetado={money(-150_000)} />);

    const saldo = screen.getByTestId("dashboard-hero-saldo");
    expect(saldo.textContent).toBe(formatBRL(money(-150_000)));
    expect(saldo.className).toContain("text-negative");
    expect(saldo.className).not.toContain("text-foreground");
  });

  it("aplica numerais tabulares ao saldo (Número Alinhado)", () => {
    render(<DashboardHero userName="Maria" month="Julho 2026" saldoProjetado={money(0)} />);

    expect(screen.getByTestId("dashboard-hero-saldo").className).toContain("tabular-nums");
  });

  it("reduz a saudação a papel secundário: um único elemento com estilo Display na página", () => {
    render(<DashboardHero userName="Maria" month="Julho 2026" saldoProjetado={money(0)} />);

    const saldo = screen.getByTestId("dashboard-hero-saldo");
    expect(saldo.className).toContain("text-4xl");
    expect(screen.getByText(/Olá,/).className).toContain("text-muted-foreground");
    expect(screen.getByText("Maria").tagName).toBe("SPAN");
  });
});
