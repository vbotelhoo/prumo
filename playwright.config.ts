import { defineConfig } from "@playwright/test";

// E2E smoke da home (design.md, componente 5; spec.md, story "Testes" AC-4;
// SETUP-10 + cobertura e2e de SETUP-03 — merge forward do placeholder de T7).
// `webServer` builda e inicia a app de produção contra o Postgres de teste;
// as env vars vêm de `process.env` (nunca hardcoded aqui) com defaults
// sensatos para dev local — em CI/produção real, sempre defina as vars.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://prumo:prumo@127.0.0.1:55432/prumo_test";
const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET ?? "e2e-local-dev-secret-not-for-production";
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: betterAuthUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm start",
    url: betterAuthUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: betterAuthSecret,
      BETTER_AUTH_URL: betterAuthUrl,
    },
  },
});
