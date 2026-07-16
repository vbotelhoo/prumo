"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { applySetCookie } from "./apply-set-cookie";
import { signOutCore } from "./sign-out-core";

// Server action pública (chamada pelo `LogoutButton`, T9; design.md,
// componente 4): destrói a sessão no servidor (não só o cookie no client) e
// redireciona para a home (AUTH-12).
export async function signOutAction(): Promise<never> {
  const { responseHeaders } = await signOutCore(await nextHeaders());

  await applySetCookie(responseHeaders);

  redirect("/");
}
