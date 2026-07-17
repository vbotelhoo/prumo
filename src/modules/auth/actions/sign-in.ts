"use server";

import { headers as nextHeaders } from "next/headers";

import { applySetCookie } from "./apply-set-cookie";
import { signInCore, type SignInActionResult } from "./sign-in-core";

export type { SignInActionResult } from "./sign-in-core";

// Server action pública (chamada pelo `LoginForm`, T9; design.md,
// componente 4): resolve `headers()` real do Next.js, delega a lógica a
// `signInCore` e aplica o `Set-Cookie` retornado no cookie jar — caller faz
// `redirect("/app")` em caso de sucesso.
export async function signInAction(
  input: Record<string, unknown>,
): Promise<SignInActionResult> {
  const { responseHeaders, ...result } = await signInCore(input, await nextHeaders());

  if (result.ok && responseHeaders) {
    await applySetCookie(responseHeaders);
  }

  return result;
}
