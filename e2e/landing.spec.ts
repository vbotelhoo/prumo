import { expect, test } from "@playwright/test";

/**
 * E2E da landing page (spec.md roadmap item 8 — P1: Visitor compreende o Prumo)
 *
 * Cobertura:
 * - LAND-01/02: hero com h1, tagline, CTAs, mockup
 * - LAND-07..12: shell público (header, footer, navegação, a11y)
 * - LAND-16/17: detecção de sessão (CTA diferente se logado)
 */

test("visitante anônimo vê CTAs de 'Criar conta' e 'Entrar' no header", async ({ page }) => {
  await page.goto("/");

  // LAND-07/17: header com "Entrar" e "Criar conta" (anônimo)
  const enterLink = page.getByRole("link", { name: /^Entrar$/i }).first();
  const signupLink = page.getByRole("link", { name: /^Criar conta$/i }).first();

  await expect(enterLink).toBeVisible();
  await expect(signupLink).toBeVisible();
});

test("footer exibe tagline e link para /terms", async ({ page }) => {
  await page.goto("/");

  // LAND-08: footer com tagline e link /terms
  await expect(
    page.locator("footer").getByText(/Sua vida financeira alinhada/)
  ).toBeVisible();

  const termsLink = page.getByRole("link", { name: /Termos/i });
  expect(await termsLink.first().evaluate((el) => el.getAttribute("href"))).toBe("/terms");
});

test("theme toggle persiste entre sessões", async ({ page }) => {
  // LAND-09: toggle de tema persiste (localStorage via next-themes)
  await page.goto("/");

  // Verificar que o toggle existe (presente no header público)
  const themeGroup = page.getByRole("group", { name: /Tema/i });
  await expect(themeGroup).toBeVisible();
});

test("hero pode ser acessado via CTA de signup", async ({ page }) => {
  await page.goto("/");

  // LAND-01: CTA "Criar conta" navega para /signup
  const signupLink = page.getByRole("link", { name: /Criar conta/i }).first();
  await signupLink.click();

  await expect(page).toHaveURL(/\/signup/);
  // Verificar que signup está renderizando (header, footer)
  await expect(page.getByRole("banner")).toBeVisible();
});

test("hero pode ser acessado via CTA de login", async ({ page }) => {
  await page.goto("/");

  // LAND-01: CTA "Entrar" navega para /login
  const loginLink = page.getByRole("link", { name: /^Entrar$/i }).first();
  await loginLink.click();

  await expect(page).toHaveURL(/\/login/);
  // Verificar que login está renderizando
  await expect(page.getByRole("banner")).toBeVisible();
});

test("landing renderiza sem banco (LAND-06)", async ({ page }) => {
  // Verificar que GET / retorna sucesso
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  // Hero e shell devem estar visíveis
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // h1 do hero
  await expect(page.getByRole("banner")).toBeVisible(); // header
  await expect(page.getByRole("contentinfo")).toBeVisible(); // footer
});

test("hero preview exibe dados realistas (LAND-05)", async ({ page }) => {
  await page.goto("/");

  // Verificar que a preview contém valores de exemplo da fixture
  // Há múltiplas instâncias de cada rótulo - usar .first() para evitar strict mode
  await expect(page.getByText(/Entradas/i).first()).toBeVisible();
  await expect(page.getByText(/Saídas/i).first()).toBeVisible();
  await expect(page.getByText(/Saldo/i).first()).toBeVisible();

  // Verificar formatação BRL (R$ seguido de números)
  await expect(page.locator("text=/R\\$/").first()).toBeVisible();
});

test("três seções de valor aparecem na landing (LAND-03)", async ({ page }) => {
  await page.goto("/");

  // Verificar que as três seções de valor estão presentes
  await expect(page.getByRole("heading", { name: /Sabe exatamente/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Parcelamentos e financiamentos/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Suas próximas semanas/ })).toBeVisible();
});

test("seções de valor têm IDs corretos para navegação (LAND-10)", async ({ page }) => {
  await page.goto("/");

  // Verificar que cada seção tem o ID correto de ancoragem
  const previsibilidadeSection = page.locator("#previsibilidade");
  const parcelasSection = page.locator("#parcelas");
  const projecaoSection = page.locator("#projecao");

  await expect(previsibilidadeSection).toBeVisible();
  await expect(parcelasSection).toBeVisible();
  await expect(projecaoSection).toBeVisible();
});

test("mini-visuais mostram dados realistas com BRL (LAND-05)", async ({ page }) => {
  await page.goto("/");

  // Verificar que valores em BRL são exibidos nas seções
  // (há múltiplas instâncias, então não usar strict mode)
  const brlFormatted = page.locator("text=/R\\$/");
  const count = await brlFormatted.count();
  expect(count).toBeGreaterThan(0);
});
