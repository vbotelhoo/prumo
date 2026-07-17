import { signOutAction } from "../actions/sign-out";
import { Button } from "@/shared";

// Botão de logout (design.md, componente 6; spec.md, story "Logout" AC-1).
// Server Component: sem estado local, só dispara `signOutAction` via
// `form action` — o Next.js App Router invoca a server action no submit e
// segue o `redirect("/")` que ela executa internamente (encerra a sessão no
// servidor antes de redirecionar, AUTH-12).
export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline">
        Sair
      </Button>
    </form>
  );
}
