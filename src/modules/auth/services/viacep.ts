import { normalizeZipCode } from "../domain/validators";

// Serviço ViaCEP com fail-open (design.md, componente 3; spec.md, story
// "Endereço via CEP"). Nunca lança para o chamador — toda falha (timeout,
// erro de rede, indisponibilidade, CEP não encontrado) vira um status
// discriminado que a UI trata como "preencha manualmente" (AUTH-06/AUTH-07).

const VIACEP_TIMEOUT_MS = 3000;

export type AddressFields = {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type LookupCepResult =
  | { status: "found"; address: AddressFields }
  | { status: "not_found" }
  | { status: "unavailable" };

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function lookupCep(cep: string): Promise<LookupCepResult> {
  const normalized = normalizeZipCode(cep);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VIACEP_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${normalized}/json/`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return { status: "unavailable" };
    }

    const data = (await response.json()) as ViaCepResponse;

    // ViaCEP responde 200 com `{ erro: true }` para CEP inexistente, em vez
    // de um status HTTP de erro.
    if (data.erro) {
      return { status: "not_found" };
    }

    return {
      status: "found",
      address: {
        zipCode: normalized,
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      },
    };
  } catch {
    // Timeout (abort), erro de rede, ou resposta que não é JSON válido —
    // fail-open: tratamos como indisponível, nunca lançamos.
    return { status: "unavailable" };
  } finally {
    clearTimeout(timeoutId);
  }
}
