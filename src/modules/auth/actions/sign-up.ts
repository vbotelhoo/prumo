"use server";

import { headers as nextHeaders } from "next/headers";

import { applySetCookie } from "./apply-set-cookie";
import { signUpCore, type SignUpActionResult } from "./sign-up-core";

export type { SignUpActionResult } from "./sign-up-core";

// Server action pública (chamada pelo `SignUpForm`, T8; design.md,
// componente 4): resolve `headers()` real do Next.js, delega a lógica a
// `signUpCore` e aplica o `Set-Cookie` retornado no cookie jar — caller faz
// `redirect("/app")` em caso de sucesso.
export async function signUpAction(
  input: Record<string, unknown>,
): Promise<SignUpActionResult> {
  const { responseHeaders, ...result } = await signUpCore(input, await nextHeaders());

  if (result.ok && responseHeaders) {
    await applySetCookie(responseHeaders);
  }

  return result;
}
