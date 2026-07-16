import { describe, expect, it, vi } from "vitest";
import { getEnv } from "@/shared";
import { register } from "../instrumentation";

vi.mock("@/shared", () => ({ getEnv: vi.fn() }));

describe("register (instrumentation hook)", () => {
  // Spec AC-4 (spec.md, story Persistência): a validação de env definida em
  // `getEnv()` só cumpre o AC se for de fato chamada no boot real — este
  // teste prova a chamada no caminho real (`register()`), não a função
  // isolada (já coberta por `shared/__tests__/env.test.ts`).
  it("calls getEnv() when the server boots", () => {
    register();

    expect(getEnv).toHaveBeenCalledTimes(1);
  });

  it("propagates the error thrown by getEnv() instead of swallowing it", () => {
    vi.mocked(getEnv).mockImplementationOnce(() => {
      throw new Error("Configuração de ambiente inválida — DATABASE_URL: obrigatório");
    });

    expect(() => register()).toThrowError(/DATABASE_URL/);
  });
});
