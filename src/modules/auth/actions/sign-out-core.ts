import { auth } from "../domain/auth";

// Núcleo do logout (design.md, componente 4; spec.md, story "Logout").
// Mesmo motivo de isolamento de `sign-up-core.ts`/`sign-in-core.ts`: fica
// fora do arquivo `"use server"` para não virar uma server action própria, e
// permite que o teste de integração chame `auth.api.signOut` com um
// `Headers` manual e confirme que a sessão foi destruída no servidor
// (AUTH-12), sem depender de `next/headers`.
export async function signOutCore(
  requestHeaders: Headers,
): Promise<{ responseHeaders: Headers }> {
  const { headers: responseHeaders } = await auth.api.signOut({
    headers: requestHeaders,
    returnHeaders: true,
  });

  return { responseHeaders };
}
