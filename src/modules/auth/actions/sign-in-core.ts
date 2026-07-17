import { auth } from "../domain/auth";
import { GENERIC_LOGIN_ERROR, loginInputSchema } from "../domain/schemas";

export type SignInActionResult = { ok: true } | { ok: false; error: string };

export type SignInCoreResult = SignInActionResult & { responseHeaders?: Headers };

// Núcleo do login (design.md, componente 4; spec.md, story "Login e sessão"
// AC-3). Mesmo motivo de isolamento de `sign-up-core.ts`: fica fora do
// arquivo `"use server"` para não virar uma server action própria, e
// permite que os testes de integração chamem `auth.api.signInEmail` com um
// `Headers` manual, sem depender de `next/headers`. Qualquer falha —
// e-mail inexistente, senha errada, erro de validação Zod — mapeia para a
// MESMA mensagem genérica, sem distinguir os casos (anti-enumeração,
// AUTH-09).
export async function signInCore(
  input: Record<string, unknown>,
  requestHeaders: Headers,
): Promise<SignInCoreResult> {
  const parsed = loginInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  try {
    const { headers: responseHeaders } = await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: requestHeaders,
      returnHeaders: true,
    });

    return { ok: true, responseHeaders };
  } catch {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }
}
