import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies } from "next/headers";

// Helper interno da fronteira de actions (design.md, componentes 4/5): a
// instância `auth` (T3) não registra o plugin `nextCookies()` — as actions
// chamam `auth.api.*` com `returnHeaders: true` e usam este helper para
// escrever o `Set-Cookie` retornado no cookie jar da requisição atual,
// reusando os mesmos parsers públicos (`better-auth/cookies`) que o plugin
// `nextCookies()` usa internamente. Sem isso a sessão nunca seria persistida
// no browser (AUTH-08/AUTH-10/AUTH-12).
export async function applySetCookie(responseHeaders: Headers): Promise<void> {
  const setCookie = responseHeaders.get("set-cookie");
  if (!setCookie) {
    return;
  }

  const cookieStore = await cookies();
  const parsed = parseSetCookieHeader(setCookie);
  parsed.forEach((attributes, name) => {
    cookieStore.set(name, attributes.value, toCookieOptions(attributes));
  });
}
