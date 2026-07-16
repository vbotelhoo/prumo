import { describe, expect, it } from "vitest";

import { prisma } from "../db";

// Integração (spec.md, story "Persistência" AC-1; story "Testes" AC-2/AC-3;
// design.md componente 5): conecta via `shared/db` (singleton de T8) e
// confirma que as tabelas do Better Auth existem pós-migration. Uma consulta
// contra uma tabela inexistente rejeita com erro do Postgres ("relation ...
// does not exist"); aqui esperamos resolução com um array, nunca rejeição.
describe("shared/db — integração pós-migration", () => {
  it("conecta ao Postgres e resolve consultas contra a tabela user", async () => {
    const users = await prisma.user.findMany();

    expect(Array.isArray(users)).toBe(true);
  });

  it("resolve consultas contra a tabela session", async () => {
    const sessions = await prisma.session.findMany();

    expect(Array.isArray(sessions)).toBe(true);
  });

  it("resolve consultas contra a tabela account", async () => {
    const accounts = await prisma.account.findMany();

    expect(Array.isArray(accounts)).toBe(true);
  });

  it("resolve consultas contra a tabela verification", async () => {
    const verifications = await prisma.verification.findMany();

    expect(Array.isArray(verifications)).toBe(true);
  });
});
