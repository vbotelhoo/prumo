import { execSync } from "node:child_process";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { seed } from "./prisma/seed";

// globalSetup do project `integration` (design.md, componente 5; spec.md,
// story "Testes" AC-2/AC-3 e edge case "sem Docker e sem DATABASE_URL").
//
// - `DATABASE_URL` de teste já definida no ambiente (modo CI/fallback) → a
//   suíte usa esse banco diretamente. A migration já roda antes (job de CI
//   dedicado, ou passo manual local), então não há nada a fazer aqui — os
//   testes leem `process.env.DATABASE_URL` normalmente, já herdado do
//   processo do Vitest.
// - Sem `DATABASE_URL` → sobe um PostgreSQL descartável via Testcontainers,
//   aplica `prisma migrate deploy` contra ele, exporta a URL para os testes
//   e derruba o container no teardown.
// - Sem Docker e sem `DATABASE_URL` → erro claro orientando as duas opções.
export default async function setup() {
  if (process.env.DATABASE_URL) {
    await seed();
    return;
  }

  const container = await new PostgreSqlContainer("postgres:17-alpine")
    .start()
    .catch((cause: unknown) => {
      throw new Error(
        "Suíte de integração sem banco de teste: suba o Docker (para o " +
          "Testcontainers provisionar um PostgreSQL descartável) ou exporte " +
          "DATABASE_URL apontando para um PostgreSQL de teste já disponível.",
        { cause },
      );
    });

  process.env.DATABASE_URL = container.getConnectionUri();
  execSync("pnpm prisma migrate deploy", { stdio: "inherit" });
  await seed();

  return async () => {
    await container.stop();
  };
}
