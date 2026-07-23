import { test, expect } from "@playwright/test";

// Tema global (design.md, "ThemeProvider + ThemeToggle"; spec.md SHELL-18..21):
// o provider vive no root layout, então qualquer rota pública já reflete a
// preferência do sistema sem precisar de sessão (T2). O controle de tema em
// si só existe dentro do shell da área logada (T7).

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

async function hasDarkClass(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
}

test.describe("Theme — segue o sistema (SHELL-18)", () => {
  test("sem preferência salva, colorScheme escuro aplica a classe dark no primeiro paint", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");

    const hasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkClass).toBe(true);

    const hydrationWarnings = consoleErrors.filter((text) => /hydrat/i.test(text));
    expect(hydrationWarnings).toEqual([]);

    await context.close();
  });

  test("sem preferência salva, colorScheme claro não aplica a classe dark", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();

    await page.goto("/");

    const hasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkClass).toBe(false);

    await context.close();
  });
});

test.describe("Theme — toggle no shell (SHELL-19..21)", () => {
  test("o controle expõe rótulo acessível e as 3 opções com nomes corretos (SHELL-21)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await signUp(page, "Toggle Labels E2E", uniqueEmail("e2e-theme-labels"));

    const group = page.getByRole("group", { name: "Tema" });
    await expect(group).toBeVisible();
    await expect(group.getByRole("button", { name: "Claro" })).toBeVisible();
    await expect(group.getByRole("button", { name: "Escuro" })).toBeVisible();
    await expect(group.getByRole("button", { name: "Sistema" })).toBeVisible();

    // Sem preferência salva, tema segue o sistema (claro, aqui) — "Sistema"
    // é a opção exposta como ativa (SHELL-21).
    await expect(group.getByRole("button", { name: "Sistema" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await context.close();
  });

  test("selecionar 'Escuro' muda a classe imediatamente, sem navegação nem reload (SHELL-19)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await signUp(page, "Toggle Immediate E2E", uniqueEmail("e2e-theme-immediate"));

    expect(await hasDarkClass(page)).toBe(false);
    const urlBefore = page.url();

    const group = page.getByRole("group", { name: "Tema" });
    await group.getByRole("button", { name: "Escuro" }).click();

    expect(await hasDarkClass(page)).toBe(true);
    expect(page.url()).toBe(urlBefore);
    await expect(group.getByRole("button", { name: "Escuro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(group.getByRole("button", { name: "Sistema" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await context.close();
  });

  test("preferência persiste após reload, aplicada já no primeiro paint sem flash (SHELL-20)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await signUp(page, "Toggle Persist E2E", uniqueEmail("e2e-theme-persist"));

    await page.getByRole("group", { name: "Tema" }).getByRole("button", { name: "Escuro" }).click();
    expect(await hasDarkClass(page)).toBe(true);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.reload();

    // A classe já vem correta no HTML resolvido pelo script inline do
    // next-themes antes do primeiro paint — não depende de nenhuma espera
    // ou re-render para já estar presente aqui.
    expect(await hasDarkClass(page)).toBe(true);
    await expect(
      page.getByRole("group", { name: "Tema" }).getByRole("button", { name: "Escuro" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(consoleErrors.filter((text) => /hydrat/i.test(text))).toEqual([]);

    await context.close();
  });

  test("voltar para 'Sistema' acompanha o colorScheme emulado do SO, sem reload (edge case SO)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await signUp(page, "Toggle System E2E", uniqueEmail("e2e-theme-system"));

    // Sistema (SO emulado escuro) é o padrão sem preferência salva.
    expect(await hasDarkClass(page)).toBe(true);

    const group = page.getByRole("group", { name: "Tema" });
    await group.getByRole("button", { name: "Claro" }).click();
    expect(await hasDarkClass(page)).toBe(false);

    await group.getByRole("button", { name: "Sistema" }).click();
    expect(await hasDarkClass(page)).toBe(true);
    await expect(group.getByRole("button", { name: "Sistema" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await context.close();
  });
});
