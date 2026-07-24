import { PublicHeader } from "./_components/public-header";
import { hasSessionCookie } from "@/modules/auth";

// Layout da área pública (design.md, componente 1; spec.md, story "Shell
// público", AC7-AC12, LAND-06). Route group (public) preserva as URLs originais
// (/`, `/login`, `/signup`, `/terms`) — nenhuma consulta a banco, sem
// sessão de verdade. Skip link + `<main>` mínimo para acessibilidade
// (LAND-12, SHELL-16).
export default async function PublicLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const sessionPresent = await hasSessionCookie();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Pular para o conteúdo
      </a>
      <PublicHeader hasSession={sessionPresent} />
      {/* tabIndex={-1}: alvo do skip link precisa ser focável
      programaticamente — <main> não é focável por padrão (SHELL-16). */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
    </>
  );
}
