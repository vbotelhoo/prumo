import { afterEach, describe, expect, it, vi } from "vitest";

import { lookupCepAction } from "../actions/lookup-cep";

// Integração (design.md, componente 4; tasks.md T7 done-when: "lookupCepAction
// delega ao service (fail-open)"). Os 3 statuses (found/not_found/unavailable)
// já são exaustivamente cobertos em `viacep.test.ts` (unit, contra a lógica
// do service); aqui confirmamos apenas que a action é um wrapper fino que
// repassa o resultado do service sem alterar o formato (AUTH-06, AUTH-07).
describe("lookupCepAction — integração", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retorna status found com os campos de endereço quando o ViaCEP resolve (fail-open path 1/3)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        logradouro: "Av. Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      }),
    }) as unknown as typeof fetch;

    const result = await lookupCepAction("01310-100");

    expect(result).toEqual({
      status: "found",
      address: {
        zipCode: "01310100",
        street: "Av. Paulista",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
    });
  });

  it("retorna status not_found quando o ViaCEP responde erro: true (fail-open path 2/3)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    }) as unknown as typeof fetch;

    const result = await lookupCepAction("00000000");

    expect(result).toEqual({ status: "not_found" });
  });

  it("retorna status unavailable em erro de rede, sem lançar e sem bloquear (fail-open path 3/3, AUTH-07)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Network request failed"));

    await expect(lookupCepAction("01310100")).resolves.toEqual({ status: "unavailable" });
  });
});
