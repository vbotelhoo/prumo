import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/shared";

// Instância Better Auth (design.md, componente 3; spec.md AC-3 da story
// Persistência): adapter Prisma + e-mail/senha habilitado. Named export
// `auth` exigido pelo CLI do Better Auth (Risks & Concerns do design).
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
});
