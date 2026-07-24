import { test, expect } from "@playwright/test";

// E2E do shell público — header e footer de visitantes anônimos e autenticados,
// âncoras de navegação apenas na landing, tema persiste entre áreas pública e logada.
// Covers LAND-07..12 (PublicHeader/Footer, LAND-16/17 (sessão), LAND-09 (tema).

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

test.describe("Shell público — header anônimo (LAND-07, LAND-16/17)", () => {
  test("anônimo vê 'Entrar' e 'Criar conta' no header, navegando para /login e /signup (LAND-07, LAND-17)", async ({
    page,
  }) => {
    await page.goto("/");

    // Wordmark como link para /
    await expect(page.getByRole("banner").getByRole("link", { name: "Prumo" })).toBeVisible();

    // CTAs de sessão anônima
    const loginLink = page.getByRole("banner").getByRole("link", { name: "Entrar" });
    const signupLink = page.getByRole("banner").getByRole("link", { name: "Criar conta" });

    await expect(loginLink).toBeVisible();
    await expect(signupLink).toBeVisible();

    // Navegação funciona
    await loginLink.click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/");
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("autenticado vê 'Ir para o app' no header, navegando para /app (LAND-16)", async ({
    page,
  }) => {
    await signUp(page, "Shell Auth E2E", uniqueEmail("e2e-landing-shell-auth"));

    // Voltando para /, o header agora mostra "Ir para o app"
    await page.goto("/");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Ir para o app" }),
    ).toBeVisible();

    // Os CTAs anônimos desapareceram
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Entrar" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Criar conta" }),
    ).not.toBeVisible();

    // Navegação funciona
    await page.getByRole("banner").getByRole("link", { name: "Ir para o app" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });
});

test.describe("Shell público — header anchors (LAND-10, LAND-11)", () => {
  test("landing mostra âncoras de navegação, outras páginas públicas não (LAND-10)", async ({
    page,
  }) => {
    await page.goto("/");

    // Anchors presentes na landing
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Previsibilidade" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Parcelas e Financiamentos" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Projeção Mensal" })).toBeVisible();

    // Anchors ausentes em /login
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "Previsibilidade" })).not.toBeVisible();

    // Anchors ausentes em /signup
    await page.goto("/signup");
    await expect(page.getByRole("link", { name: "Previsibilidade" })).not.toBeVisible();

    // Anchors ausentes em /terms
    await page.goto("/terms");
    await expect(page.getByRole("link", { name: "Previsibilidade" })).not.toBeVisible();
  });

  test("viewport 375px esconde âncoras e 'Entrar' (sm), mas mantém wordmark, 'Criar conta' e toggle visíveis (LAND-11)", async ({
    page,
  }) => {
    page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Wordmark e CTAs visíveis
    await expect(page.getByRole("banner").getByRole("link", { name: "Prumo" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Criar conta" })).toBeVisible();

    // "Entrar" oculto em mobile (< sm breakpoint)
    await expect(page.getByRole("banner").getByRole("link", { name: "Entrar" })).not.toBeVisible();

    // Toggle de tema visível
    await expect(page.getByRole("group", { name: "Tema" })).toBeVisible();

    // Âncoras ocultas
    await expect(page.getByRole("link", { name: "Previsibilidade" })).not.toBeVisible();

    // Sem overflow horizontal
    const htmlWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(htmlWidth).toBeLessThanOrEqual(375);
  });
});

// Footer tests moved to T6 (PublicFooter implementation)

test.describe("Shell público — theme persistência (LAND-09)", () => {
  test("tema selecionado no header público persiste na área logada e vice-versa", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();

    // Na landing, selecionar tema escuro
    await page.goto("/");
    const group = page.getByRole("group", { name: "Tema" });
    await group.getByRole("button", { name: "Escuro" }).click();
    let hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);

    // Fazer signup
    await page.goto("/signup");
    await page.getByLabel("Nome").fill("Theme Persist E2E");
    await page.getByLabel("Data de nascimento").fill("1990-05-20");
    await page.getByLabel("CPF").fill(uniqueValidCpf());
    await page.getByLabel("CEP").fill("01310-100");
    await page.getByLabel("Logradouro").fill("Av. Paulista");
    await page.getByLabel("Número").fill("1000");
    await page.getByLabel("Bairro").fill("Bela Vista");
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("UF").fill("SP");
    const email = uniqueEmail("e2e-landing-theme-persist");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirmar senha").fill(PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar conta" }).click();
    await page.waitForURL("/app");

    // Na área logada, tema escuro deve estar mantido
    hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);

    // Toggle de tema na área logada existe e reflete a seleção
    await expect(
      page.getByRole("group", { name: "Tema" }).getByRole("button", { name: "Escuro" }),
    ).toHaveAttribute("aria-pressed", "true");

    await context.close();
  });
});
