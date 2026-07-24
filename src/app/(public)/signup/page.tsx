import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, SignUpForm } from "@/modules/auth";

// LAND-19: Metadata da página de signup
export const metadata: Metadata = {
  title: "Criar conta — Prumo",
};

// Página `/signup` (design.md, componente 7; spec.md, story "Login e
// sessão" AC6): usuário já autenticado que acessa `/signup` é redirecionado
// para a área interna — `getSession` é a autoridade real (não só o cookie
// otimista do proxy).
export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/app");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg">
        <SignUpForm />
      </div>
    </div>
  );
}
