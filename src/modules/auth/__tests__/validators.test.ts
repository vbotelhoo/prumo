import { describe, expect, it } from "vitest";

import {
  isAdult,
  isValidCpf,
  normalizeCpf,
  normalizeZipCode,
} from "../domain/validators";

// spec.md, edge case: "WHEN o CPF é submetido com máscara
// (`000.000.000-00`) ou sem THEN o sistema SHALL normalizar para 11
// dígitos antes de validar e persistir."
describe("normalizeCpf", () => {
  it("strips mask characters from a masked CPF down to 11 digits", () => {
    expect(normalizeCpf("111.444.777-35")).toBe("11144477735");
  });

  it("keeps an already-unmasked CPF unchanged", () => {
    expect(normalizeCpf("11144477735")).toBe("11144477735");
  });
});

// spec.md, edge case: "WHEN o CEP é submetido com máscara (`00000-000`) ou
// sem THEN o sistema SHALL normalizar para 8 dígitos antes de consultar e
// persistir."
describe("normalizeZipCode", () => {
  it("strips mask characters from a masked zip code down to 8 digits", () => {
    expect(normalizeZipCode("01310-100")).toBe("01310100");
  });

  it("keeps an already-unmasked zip code unchanged", () => {
    expect(normalizeZipCode("01310100")).toBe("01310100");
  });
});

// AC1.6 (spec.md, story "Cadastro com perfil completo"): "WHEN o CPF
// submetido falha na validação dos dígitos verificadores (algoritmo
// oficial) THEN o sistema SHALL rejeitar a submissão indicando CPF
// inválido."
describe("isValidCpf", () => {
  it("accepts a CPF with correct check digits (normalized, 11 digits)", () => {
    // 111.444.777-35 é um CPF de teste amplamente documentado que passa o
    // algoritmo oficial dos dígitos verificadores.
    expect(isValidCpf("11144477735")).toBe(true);
  });

  it("rejects a CPF with an incorrect check digit", () => {
    expect(isValidCpf("11144477736")).toBe(false);
  });

  it("rejects a CPF with all repeated digits (mathematically passes but is never real)", () => {
    expect(isValidCpf("11111111111")).toBe(false);
  });

  it("rejects a CPF with fewer than 11 digits", () => {
    expect(isValidCpf("1114447773")).toBe(false);
  });

  it("rejects a CPF with more than 11 digits", () => {
    expect(isValidCpf("111444777355")).toBe(false);
  });

  it("rejects a CPF containing non-digit characters (not normalized first)", () => {
    expect(isValidCpf("111.444.777-35")).toBe(false);
  });
});

// AC1.5 (spec.md, story "Cadastro com perfil completo"): "WHEN a data de
// nascimento corresponde a idade menor que 18 anos (ou é inválida/futura)
// THEN o sistema SHALL rejeitar a submissão indicando a exigência de 18+."
describe("isAdult", () => {
  const referenceToday = new Date(Date.UTC(2026, 6, 16)); // 2026-07-16

  it("accepts someone who turned exactly 18 today", () => {
    expect(isAdult("2008-07-16", referenceToday)).toBe(true);
  });

  it("rejects someone who turns 18 tomorrow (still 17 today)", () => {
    expect(isAdult("2008-07-17", referenceToday)).toBe(false);
  });

  it("accepts someone older than 18", () => {
    expect(isAdult("1990-01-01", referenceToday)).toBe(true);
  });

  it("rejects a minor (under 18)", () => {
    expect(isAdult("2010-01-01", referenceToday)).toBe(false);
  });

  it("rejects an invalid calendar date", () => {
    expect(isAdult("2024-02-30", referenceToday)).toBe(false);
  });

  it("rejects a future birth date", () => {
    expect(isAdult("2027-01-01", referenceToday)).toBe(false);
  });

  it("rejects a malformed date string", () => {
    expect(isAdult("not-a-date", referenceToday)).toBe(false);
  });
});
