import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";

// Layout da área interna protegida `/app` (design.md, componente 7; spec.md,
// story "Login e sessão" AC5, story "Logout" AC2, AUTH-11): autoridade real
// de sessão via `auth.api.getSession` (não só o cookie otimista checado no
// proxy) — sem sessão, redireciona para `/login`. Com sessão, deixa a
// requisição seguir para os children (a página `/app` resolve a própria
// sessão para ler o nome do usuário — App Router não repassa props
// customizadas de layout para page).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return children;
}
