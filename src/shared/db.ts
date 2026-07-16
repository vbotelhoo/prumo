import { PrismaClient } from "@prisma/client";

// Singleton do Prisma Client (design.md, componente 3). Padrão oficial do
// Prisma para Next.js: reusa a instância guardada em `globalThis` durante o
// hot-reload do dev server, evitando esgotar as conexões do Postgres ao
// recriar o client em cada recompilação.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
