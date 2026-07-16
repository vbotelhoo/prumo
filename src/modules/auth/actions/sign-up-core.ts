import { auth } from "../domain/auth";
import { GENERIC_SIGNUP_ERROR, signUpInputSchema } from "../domain/schemas";

export type SignUpActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type SignUpCoreResult = SignUpActionResult & { responseHeaders?: Headers };

// Núcleo do cadastro (design.md, componente 4; spec.md, story "Cadastro com
// perfil completo"). Fica fora do arquivo `"use server"` (`sign-up.ts`) de
// propósito: um arquivo com a diretiva `"use server"` no topo expõe TODO
// export async como uma server action chamável via RPC pelo client — isolar
// o núcleo aqui garante que só `signUpAction` (o wrapper) é uma fronteira
// pública, e permite que os testes de integração chamem esta função com um
// `Headers` construído manualmente, sem depender de `next/headers` (que só
// resolve dentro de uma request real do Next.js).
//
// Zod valida na fronteira (AUTH-05) antes de qualquer chamada ao Better
// Auth; `termsAcceptedAt` NUNCA é montado aqui — é injetado por
// `databaseHooks.user.create.before` (T3), o único caminho válido (ver nota
// técnica em `domain/auth.ts`). Qualquer falha de unicidade (e-mail OU CPF)
// ou erro do Better Auth vira a mesma mensagem genérica (AUTH-03,
// anti-enumeração) — nenhuma linha fica no banco porque o adapter só grava
// se o `create` inteiro suceder.
export async function signUpCore(
  input: Record<string, unknown>,
  requestHeaders: Headers,
): Promise<SignUpCoreResult> {
  const parsed = signUpInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: GENERIC_SIGNUP_ERROR,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const {
    name,
    email,
    password,
    birthDate,
    cpf,
    zipCode,
    street,
    addressNumber,
    complement,
    neighborhood,
    city,
    state,
  } = parsed.data;

  try {
    const { headers: responseHeaders } = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        birthDate,
        cpf,
        zipCode,
        street,
        addressNumber,
        complement,
        neighborhood,
        city,
        state,
      },
      headers: requestHeaders,
      returnHeaders: true,
    });

    return { ok: true, responseHeaders };
  } catch {
    // Unicidade de e-mail (APIError do Better Auth) ou de CPF (constraint
    // do Prisma, @@unique([cpf]) de T4) — mesma mensagem genérica em ambos
    // os casos, sem distinguir o campo causador (AUTH-03).
    return { ok: false, error: GENERIC_SIGNUP_ERROR };
  }
}
