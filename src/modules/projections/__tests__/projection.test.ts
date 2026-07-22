import { describe, it, expect } from "vitest";
import { money } from "@/shared";
import { buildMonthlyProjection } from "../domain/projection";

describe("buildMonthlyProjection", () => {
  it("calculates all four aggregates with mixed values", () => {
    const result = buildMonthlyProjection({
      month: "2026-07",
      entradas: money(100000), // R$ 1.000
      saidasAvulsas: money(30000), // R$ 300
      parcelasDoMes: money(20000), // R$ 200
    });

    // saidasPrevistas = 30000 + 20000 = 50000
    // saldoProjetado = 100000 - 50000 = 50000
    // totalComprometido = 20000
    expect(result.month).toBe("2026-07");
    expect(result.entradasPrevistas).toBe(money(100000));
    expect(result.saidasPrevistas).toBe(money(50000)); // avulsas + parcelas
    expect(result.saldoProjetado).toBe(money(50000)); // entradas - saidas
    expect(result.totalComprometido).toBe(money(20000)); // parcelas only
  });

  it("handles negative saldo when saidas > entradas", () => {
    const result = buildMonthlyProjection({
      month: "2026-07",
      entradas: money(30000), // R$ 300
      saidasAvulsas: money(50000), // R$ 500
      parcelasDoMes: money(40000), // R$ 400
    });

    // saidasPrevistas = 50000 + 40000 = 90000
    // saldoProjetado = 30000 - 90000 = -60000 (negative)
    expect(result.saldoProjetado).toBe(money(-60000));
  });

  it("returns all zeros when no values", () => {
    const result = buildMonthlyProjection({
      month: "2026-07",
      entradas: money(0),
      saidasAvulsas: money(0),
      parcelasDoMes: money(0),
    });

    expect(result.entradasPrevistas).toBe(money(0));
    expect(result.saidasPrevistas).toBe(money(0));
    expect(result.saldoProjetado).toBe(money(0));
    expect(result.totalComprometido).toBe(money(0));
  });

  it("handles case with only parcelas (no loose saidas)", () => {
    const result = buildMonthlyProjection({
      month: "2026-07",
      entradas: money(100000), // R$ 1.000
      saidasAvulsas: money(0), // no loose saidas
      parcelasDoMes: money(60000), // R$ 600 parcelas
    });

    // saidasPrevistas = 0 + 60000 = 60000 (all from parcelas)
    // saldoProjetado = 100000 - 60000 = 40000
    // totalComprometido = 60000
    expect(result.saidasPrevistas).toBe(money(60000));
    expect(result.saldoProjetado).toBe(money(40000));
    expect(result.totalComprometido).toBe(money(60000));
  });

  it("does not dedupe entrada and saida of same value", () => {
    const result = buildMonthlyProjection({
      month: "2026-07",
      entradas: money(50000), // R$ 500
      saidasAvulsas: money(50000), // R$ 500 (same amount)
      parcelasDoMes: money(0),
    });

    // Both are counted separately, not deduped
    // saidasPrevistas = 50000 + 0 = 50000
    // saldoProjetado = 50000 - 50000 = 0
    expect(result.entradasPrevistas).toBe(money(50000));
    expect(result.saidasPrevistas).toBe(money(50000));
    expect(result.saldoProjetado).toBe(money(0)); // balanced, no dedup
  });

  it("encodes month in result", () => {
    const result = buildMonthlyProjection({
      month: "2026-03",
      entradas: money(10000),
      saidasAvulsas: money(5000),
      parcelasDoMes: money(2000),
    });

    expect(result.month).toBe("2026-03");
  });
});
