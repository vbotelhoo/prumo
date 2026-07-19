import { describe, expect, it } from "vitest";
import { transactionInputSchema } from "../domain/schemas";

describe("transactionInputSchema", () => {
  // T5: data válida "2025-03-15" → válido
  it("accepts valid date '2025-03-15'", () => {
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2025-03-15",
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
  });

  // T5: data "1999-12-31" (antes de 2000) → erro
  it("rejects date '1999-12-31' before year 2000", () => {
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "1999-12-31",
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(false);
  });

  // T5: data "2000-01-01" (boundary) → válido
  it("accepts boundary date '2000-01-01'", () => {
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2000-01-01",
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
  });

  // T5: description ausente → válido
  it("accepts transaction without description", () => {
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2025-03-15",
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });

  // T5: description vazia → undefined
  it("transforms empty description to undefined", () => {
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2025-03-15",
      amountRaw: "1000,00",
      description: "",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });

  // T5: description 140 chars → válido
  it("accepts description with exactly 140 characters", () => {
    const desc140 = "a".repeat(140);
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2025-03-15",
      amountRaw: "1000,00",
      description: desc140,
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
  });

  // T5: description 141 chars → erro
  it("rejects description with 141 characters", () => {
    const desc141 = "a".repeat(141);
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2025-03-15",
      amountRaw: "1000,00",
      description: desc141,
      categoryId: "cat-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Máximo 140 caracteres");
    }
  });

  // T5: amountRaw vazio → erro
  it("rejects empty amountRaw", () => {
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2025-03-15",
      amountRaw: "",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(false);
  });

  // T5: type "invalido" → erro
  it("rejects invalid type 'invalido'", () => {
    const result = transactionInputSchema.safeParse({
      type: "invalido",
      date: "2025-03-15",
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(false);
  });

  // T5: type "entrada" → válido
  it("accepts type 'entrada'", () => {
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: "2025-03-15",
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
  });

  // T5: type "saida" → válido
  it("accepts type 'saida'", () => {
    const result = transactionInputSchema.safeParse({
      type: "saida",
      date: "2025-03-15",
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
  });

  // T5: data futura válida (dentro de 100 anos) → aceita
  it("accepts future date within allowed range", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 50);
    const dateStr = futureDate.toISOString().split("T")[0];
    const result = transactionInputSchema.safeParse({
      type: "entrada",
      date: dateStr,
      amountRaw: "1000,00",
      categoryId: "cat-1",
    });
    expect(result.success).toBe(true);
  });
});
