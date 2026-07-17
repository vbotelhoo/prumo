import { headers } from "next/headers";

import { auth, LogoutButton } from "@/modules/auth";

// Página interna placeholder `/app` (design.md, componente 7; spec.md,
// context.md — "Página interna placeholder": saudação com o nome do
// usuário + botão de logout, mínimo que prova sessão e viabiliza o E2E).
// A sessão já foi validada pelo layout (`AppLayout`); esta página resolve
// `getSession` novamente só para ler `session.user.name` (App Router não
// repassa props customizadas de layout para page). Substituída pelo
// dashboard em feature futura do roadmap.
export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const name = session?.user.name ?? "";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex flex-col items-center gap-6">
        <p className="text-lg">
          Olá, <span className="font-semibold">{name}</span>!
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}
