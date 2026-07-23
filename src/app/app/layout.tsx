import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { AppShell } from "./_components/app-shell";

// Layout da área interna protegida `/app` (design.md, componente 7; spec.md,
// story "Login e sessão" AC5, story "Logout" AC2, AUTH-11; SHELL-01..07):
// autoridade real de sessão via `auth.api.getSession` (não só o cookie
// otimista checado no proxy) — sem sessão, redireciona para `/login`. Com
// sessão, compõe o shell de navegação (SHELL-05: nome do usuário) em volta
// dos children.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return <AppShell userName={session.user.name}>{children}</AppShell>;
}
