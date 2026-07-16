"use server";

import { lookupCep, type LookupCepResult } from "../services/viacep";

// Wrapper fino sobre o service ViaCEP (design.md, componente 4; AUTH-06,
// AUTH-07). Sem lógica própria — só expõe `lookupCep` como server action
// para o client chamar a partir do formulário de cadastro.
export async function lookupCepAction(cep: string): Promise<LookupCepResult> {
  return lookupCep(cep);
}
