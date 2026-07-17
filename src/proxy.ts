import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route proxy (Next.js 16 — AD-013, `proxy.ts` no lugar de `middleware.ts`;
// design.md, componente 8; spec.md, story "Login e sessão" AC5/AC6, AUTH-11):
// redirect otimista por cookie, sem tocar o banco. `/app/*` sem cookie de
// sessão → `/login`; `/login` ou `/signup` com cookie → `/app`. Este check é
// otimista (só olha se o cookie existe, não valida a sessão de verdade) — a
// autoridade real é `auth.api.getSession` no layout de `/app`.
export default function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/app") && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/signup") && sessionCookie) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
