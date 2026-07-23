import { test, expect } from "@playwright/test";

// E2E do shell de navegação desktop (design.md, componente AppShell; spec.md
// SHELL-01..07, SHELL-15..17). Drawer mobile entra em T6, toggle de tema em
// T7 — este arquivo cobre só a sidebar fixa (≥lg, viewport padrão do
// Playwright é 1280×720).

function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function uniqueValidCpf(): string {
  let base: number[];
  do {
    base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (base.every((digit) => digit === base[0]));

  const d1 = checkDigit(base, 10);
  const d2 = checkDigit([...base, d1], 11);
  return [...base, d1, d2].join("");
}

const PASSWORD = "Senha@123";

async function signUp(page: import("@playwright/test").Page, name: string, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Data de nascimento").fill("1990-05-20");
  await page.getByLabel("CPF").fill(uniqueValidCpf());
  await page.getByLabel("CEP").fill("01310-100");
  await page.getByLabel("Logradouro").fill("Av. Paulista");
  await page.getByLabel("Número").fill("1000");
  await page.getByLabel("Bairro").fill("Bela Vista");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("/app");
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

const SECTIONS = [
  { label: "Dashboard", path: "/app" },
  { label: "Transações", path: "/app/transactions" },
  { label: "Compromissos", path: "/app/commitments" },
  { label: "Categorias", path: "/app/categories" },
  { label: "Projeções", path: "/app/projections" },
];

test.describe("Shell — sidebar desktop (SHELL-01..07, SHELL-15..17)", () => {
  test("navega pelas 5 seções via clique, cada uma marcando aria-current sozinha (SHELL-01/02/03)", async ({
    page,
  }) => {
    await signUp(page, "Sidebar E2E", uniqueEmail("e2e-shell-nav"));

    const nav = page.getByRole("navigation", { name: "Navegação principal" });

    for (const section of SECTIONS) {
      await nav.getByRole("link", { name: section.label }).click();
      await expect(page).toHaveURL(new RegExp(`${section.path}$`));

      // Exatamente um item com aria-current="page" — nunca dois (SHELL-03).
      const current = nav.locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(section.label);
    }
  });

  test("marca 'Prumo' no topo da sidebar é um link para /app (SHELL-04)", async ({ page }) => {
    await signUp(page, "Brand E2E", uniqueEmail("e2e-shell-brand"));

    await page.goto("/app/categories");
    await page.getByRole("link", { name: "Prumo" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("nome do usuário aparece no shell em qualquer página, logout de /app/categories redireciona para / e revoga a sessão (SHELL-05/06/07)", async ({
    page,
  }) => {
    const name = "Logout Shell E2E";
    await signUp(page, name, uniqueEmail("e2e-shell-logout"));

    await page.goto("/app/categories");
    await expect(page.getByText(name, { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/$/);

    // AUTH-11 preservado: guard do layout ainda redireciona sem sessão.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("skip link é o primeiro elemento focável e move o foco ao conteúdo principal (SHELL-16)", async ({
    page,
  }) => {
    await signUp(page, "Skip Link E2E", uniqueEmail("e2e-shell-skip"));

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("navegação é um landmark <nav> com rótulo acessível (SHELL-15)", async ({ page }) => {
    await signUp(page, "Landmark E2E", uniqueEmail("e2e-shell-landmark"));

    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  });

  test("nome de usuário maior que a sidebar trunca com ellipsis, sem quebrar o layout (SHELL-17)", async ({
    page,
  }) => {
    const longName = "Maria Fernanda de Oliveira Souza Albuquerque Nascimento Pereira";
    await signUp(page, longName, uniqueEmail("e2e-shell-truncate"));

    const nameEl = page.locator("aside").getByText(longName, { exact: false });
    await expect(nameEl).toBeVisible();

    const overflowsContainer = await nameEl.evaluate(
      (el) => el.scrollWidth > el.clientWidth,
    );
    expect(overflowsContainer).toBe(true);

    const asideBox = await page.locator("aside").boundingBox();
    expect(asideBox?.width).toBeLessThan(400);
  });
});

test.describe("Shell — drawer mobile (SHELL-08..11)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("abaixo de 1024px a sidebar fica oculta e a topbar com botão de menu aparece (SHELL-08)", async ({
    page,
  }) => {
    await signUp(page, "Mobile Topbar E2E", uniqueEmail("e2e-shell-mobile-topbar"));

    await expect(page.locator("aside")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  });

  test("o menu abre um drawer com os mesmos links, marca e ações da sidebar; navegar fecha o drawer (SHELL-09/10)", async ({
    page,
  }) => {
    await signUp(page, "Mobile Drawer E2E", uniqueEmail("e2e-shell-mobile-drawer"));

    await page.getByRole("button", { name: "Abrir menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Prumo")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Transações" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Sair" })).toBeVisible();

    await dialog.getByRole("link", { name: "Transações" }).click();

    await expect(page).toHaveURL(/\/app\/transactions$/);
    await expect(dialog).not.toBeVisible();
  });

  test("Esc fecha o drawer aberto (SHELL-11)", async ({ page }) => {
    await signUp(page, "Mobile Esc E2E", uniqueEmail("e2e-shell-mobile-esc"));

    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("clicar no overlay fecha o drawer aberto (SHELL-11)", async ({ page }) => {
    await signUp(page, "Mobile Overlay E2E", uniqueEmail("e2e-shell-mobile-overlay"));

    await page.getByRole("button", { name: "Abrir menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // O drawer ocupa 256px (w-64) à esquerda; um clique na borda direita da
    // viewport de 390px cai fora do popup, sobre o overlay.
    await page.mouse.click(370, 20);
    await expect(dialog).not.toBeVisible();
  });

  test("acima de 1024px a topbar desaparece e a sidebar volta a aparecer", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUp(page, "Desktop Again E2E", uniqueEmail("e2e-shell-desktop-again"));

    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir menu" })).not.toBeVisible();
  });
});
