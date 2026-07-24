import { cookies } from "next/headers";

/**
 * Optimistic session detection for server components on public pages.
 *
 * Checks for the presence of a Better Auth session token cookie without
 * querying the database. The session validity is verified by the real
 * `getSession()` in protected route layouts (authority remains in /app).
 *
 * Used by the public shell layout to decide between "Entrar"/"Criar conta"
 * CTAs (no session) vs. "Ir para o app" (session present) — LAND-16/17.
 *
 * The cookie is httpOnly and set only after successful auth, so its
 * presence alone is a sufficient signal for optimistic detection.
 *
 * Handles both development (unprefixed) and production HTTPS (prefixed
 * with __Secure-) cookie names automatically.
 */
export async function hasSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies();

  // Better Auth default session cookie names (checked in order of preference)
  const cookieNames = [
    "__Secure-better-auth.session_token", // Production HTTPS
    "better-auth.session_token", // Development / non-HTTPS
    "__Secure-better-auth-session_token", // Variant with hyphen (production)
    "better-auth-session_token", // Variant with hyphen (dev)
  ];

  for (const name of cookieNames) {
    if (cookieStore.has(name)) {
      return true;
    }
  }

  return false;
}
