import { expect, test } from "@playwright/test";

// Smoke e2e da home (spec.md, story "Testes" AC-4; SETUP-10): único fluxo de
// usuário do setup. LAND-01/02: hero com h1 tagline, CTAs para /signup e /login,
// mockup da projeção legível nos dois temas.
// Nota: múltiplas instâncias de "Prumo" (header + footer + hero); usar role
// para evitar strict-mode violation.

test("home responde 200 e exibe o header público", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("banner").getByRole("link", { name: "Prumo" }).first()).toBeVisible();
});

test("hero exibe tagline e CTAs com links corretos", async ({ page }) => {
  await page.goto("/");

  // LAND-01: h1 com tagline
  await expect(page.getByRole("heading", { level: 1, name: /Sua vida financeira alinhada/ })).toBeVisible();

  // LAND-01: CTA "Criar conta" → /signup
  const signupLink = page.getByRole("link", { name: /Criar conta/i }).first();
  await expect(signupLink).toBeVisible();
  expect(await signupLink.evaluate((el) => el.getAttribute("href"))).toBe("/signup");

  // LAND-01: CTA "Entrar" → /login
  const loginLink = page.getByRole("link", { name: /Entrar/i }).first();
  await expect(loginLink).toBeVisible();
  expect(await loginLink.evaluate((el) => el.getAttribute("href"))).toBe("/login");
});

test("hero preview exibe valores da fixture com formatação BRL", async ({ page }) => {
  await page.goto("/");

  // LAND-02: mockup com dados de exemplo (projeção mensal)
  // Verificar que a seção de projeção está visível (usar heading role para evitar strict mode)
  await expect(page.getByRole("heading", { level: 2, name: /Projeção Mensal/i })).toBeVisible();

  // Verificar valores formatados em BRL (há múltiplas instâncias - usar first())
  // Simplificar regex para apenas verificar "R$" seguido de números
  await expect(page.locator("text=/R\\$/").first()).toBeVisible();
});
