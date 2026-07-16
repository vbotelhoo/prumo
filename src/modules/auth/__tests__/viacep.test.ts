import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lookupCep } from "../services/viacep";

// spec.md, story "Endereço via CEP via ViaCEP com fail-open":
// AC1: CEP válido + ViaCEP retorna dados → preenche logradouro, bairro,
//      cidade e UF.
// AC2: falha (timeout, erro de rede, indisponibilidade) OU CEP não
//      encontrado → nunca lança, nunca bloqueia o cadastro.
describe("lookupCep", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("returns status found with address fields when ViaCEP resolves data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        logradouro: "Av. Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      }),
    }) as unknown as typeof fetch;

    const result = await lookupCep("01310-100");

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

  it("normalizes a masked cep before querying and returns it normalized", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        logradouro: "Rua X",
        bairro: "Bairro Y",
        localidade: "Cidade Z",
        uf: "ZZ",
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await lookupCep("01310-100");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/01310100/json/",
      expect.anything(),
    );
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.address.zipCode).toBe("01310100");
    }
  });

  it("returns status not_found when ViaCEP responds with erro: true", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    }) as unknown as typeof fetch;

    const result = await lookupCep("00000000");

    expect(result).toEqual({ status: "not_found" });
  });

  it("returns status unavailable when the request times out", async () => {
    global.fetch = vi.fn().mockImplementation(
      (_url: string, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;

    const resultPromise = lookupCep("01310100");
    await vi.advanceTimersByTimeAsync(3000);
    const result = await resultPromise;

    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns status unavailable on a network error", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));

    const result = await lookupCep("01310100");

    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns status unavailable on a non-ok HTTP response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const result = await lookupCep("01310100");

    expect(result).toEqual({ status: "unavailable" });
  });

  it("never throws even when fetch rejects unexpectedly", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(lookupCep("01310100")).resolves.toEqual({
      status: "unavailable",
    });
  });
});
