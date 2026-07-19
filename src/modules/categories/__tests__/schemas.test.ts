import { describe, expect, it } from "vitest";
import { createCategoryInputSchema } from "../domain/schemas";

describe("createCategoryInputSchema", () => {
  // T4: nome vazio → "Nome obrigatório"
  it("rejects empty name with 'Nome obrigatório'", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "",
      type: "entrada",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome obrigatório");
    }
  });

  // T4: nome com apenas espaços → inválido após trim
  it("rejects name with only spaces", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "   ",
      type: "entrada",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome obrigatório");
    }
  });

  // T4: nome 40 chars → válido
  it("accepts name with exactly 40 characters", () => {
    const name40 = "a".repeat(40);
    const result = createCategoryInputSchema.safeParse({
      name: name40,
      type: "entrada",
    });
    expect(result.success).toBe(true);
  });

  // T4: nome 41 chars → inválido
  it("rejects name with 41 characters", () => {
    const name41 = "a".repeat(41);
    const result = createCategoryInputSchema.safeParse({
      name: name41,
      type: "entrada",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Máximo 40 caracteres");
    }
  });

  // T4: tipo "entrada" → válido
  it("accepts type 'entrada'", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Salário",
      type: "entrada",
    });
    expect(result.success).toBe(true);
  });

  // T4: tipo "saida" → válido
  it("accepts type 'saida'", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Alimentação",
      type: "saida",
    });
    expect(result.success).toBe(true);
  });

  // T4: tipo "outro" → inválido
  it("rejects type 'outro'", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Teste",
      type: "outro",
    });
    expect(result.success).toBe(false);
  });

  // T4: nome com espaços é trimmed
  it("trims whitespace from name", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "  Salário  ",
      type: "entrada",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Salário");
    }
  });
});
