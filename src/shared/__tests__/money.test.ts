import { describe, expect, it } from "vitest";
import { addMoney, formatBRL, money, subtractMoney } from "../money";

describe("formatBRL", () => {
  // AC-1 (spec.md, story Money): 123456 centavos → "R$ 1.234,56" (pt-BR).
  // Nota: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`
  // usa um espaço não separável (U+00A0) entre "R$" e o valor — visualmente
  // idêntico a "R$ 1.234,56", mas o caractere real não é um espaço comum.
  it("formats 123456 cents as R$ 1.234,56", () => {
    expect(formatBRL(money(123456))).toBe("R$\u00A01.234,56");
  });

  it("formats zero as R$ 0,00", () => {
    expect(formatBRL(money(0))).toBe("R$\u00A00,00");
  });

  it("formats negative values with a minus sign", () => {
    expect(formatBRL(money(-500))).toBe("-R$\u00A05,00");
  });

  it("formats large values with thousands separators", () => {
    expect(formatBRL(money(1_000_000_00))).toBe("R$\u00A01.000.000,00");
  });
});

describe("addMoney / subtractMoney", () => {
  // AC-2: aritmética inteira exata (sem ponto flutuante), centavos exatos.
  it("adds two Money values as exact integer cents", () => {
    expect(addMoney(money(100), money(250))).toBe(350);
  });

  it("subtracts two Money values as exact integer cents", () => {
    expect(subtractMoney(money(250), money(100))).toBe(150);
  });

  it("keeps exact cents on values that are lossy as floating point (0.1 + 0.2 case)", () => {
    expect(addMoney(money(10), money(20))).toBe(30);
  });

  it("supports negative results from subtraction", () => {
    expect(subtractMoney(money(100), money(250))).toBe(-150);
  });
});

describe("money construction", () => {
  // AC-3: não-inteiro/NaN/Infinity rejeitados, nunca truncados.
  it("rejects non-integer numbers instead of truncating", () => {
    expect(() => money(10.5)).toThrow();
  });

  it("rejects NaN", () => {
    expect(() => money(NaN)).toThrow();
  });

  it("rejects Infinity", () => {
    expect(() => money(Infinity)).toThrow();
  });

  it("rejects -Infinity", () => {
    expect(() => money(-Infinity)).toThrow();
  });

  it("accepts zero", () => {
    expect(money(0)).toBe(0);
  });

  it("accepts negative integers", () => {
    expect(money(-1234)).toBe(-1234);
  });

  it("accepts large integer values", () => {
    expect(money(999_999_999)).toBe(999_999_999);
  });
});
